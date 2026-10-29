# Jak działa autoryzacja GamesDB — przewodnik do powtórki

> Aktualizacja: aplikacja korzysta teraz z osobnego projektu Supabase games-db.
> Konfiguracja i kroki migracji: [SMTP i Supabase](KONFIGURACJA-SMTP-I-SUPABASE.md).
> Wzmianki o postle poniżej opisują wcześniejszy etap, a nie docelową bazę.

## 1. Architektura

```text
Formularz React → Server Action → walidacja Zod → Prisma → PostgreSQL w Supabase
                                  ↓
                        Auth.js → zaszyfrowany JWT w ciasteczku HttpOnly
                                  ↓
                         requireUser() → chroniony panel konta
```

Uwierzytelnianie odpowiada na pytanie „kim jesteś?”. Autoryzacja decyduje,
czy możesz wykonać operację. Sesja pozwala rozpoznać użytkownika przy kolejnych
żądaniach. W tym projekcie użytkownik może zmieniać tylko własny profil i hasło.
Nie ma jeszcze ról administratora ani modelu uprawnień do przyszłych danych gier.

Supabase jest tutaj dostawcą PostgreSQL. Nie uruchamiamy równolegle Supabase Auth,
bo wtedy mielibyśmy dwa systemy kont i dwa sposoby obsługi sesji. Zachowujemy
architekturę Twojego szablonu. Supabase Auth byłby sensowną alternatywą przy
przebudowie całej warstwy tożsamości, zwłaszcza z dostępem przez Data API i RLS
opartym o `auth.uid()`. Tutaj użytkownik Auth.js nie ma automatycznie tożsamości
Supabase, więc taka polityka nie rozpoznałaby jego sesji.

## 2. Co zostało wykonane, krok po kroku

1. Przeanalizowałem `lib/auth.ts`, akcje, formularze, schematy i zależności szablonu.
2. Zachowałem Next.js 16 i React 19 z nowego projektu oraz biblioteki szablonu.
3. Zaktualizowałem Auth.js do wydania wspierającego Next.js 16 i poprawiłem
   podatne zależności wykryte przez npm audit.
4. Utworzyłem modele Prisma i migrację wyłącznie dla `games_db`. Model ma jawne
   `@@schema("games_db")`, co chroni przed przypadkowym wskazaniem `public`.
5. Dodałem połączenie Prisma ze współdzielonym klientem w development.
6. Skonfigurowałem Credentials i Google w Auth.js oraz oficjalną strategię JWT.
7. Dodałem akcje rejestracji, logowania, wylogowania, profilu, zmiany i resetu hasła.
8. Zbudowałem wspólny formularz Conform i schematy Zod używane w obu środowiskach.
9. Dodałem chroniony panel i kontrole uprawnień wewnątrz każdej prywatnej akcji.
10. Przygotowałem responsywny interfejs, dostępne etykiety, obsługę błędów,
    wskaźniki oczekiwania, pokazywanie haseł i zmianę motywu.
11. Sprawdziłem build, typy, lint, walidację, połączenie, ograniczenia bazy
    i pełny przepływ przez HTTP. Dane testowe są automatycznie sprzątane.

## 3. Najważniejsze pliki

| Plik                                  | Odpowiedzialność                                                         |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `prisma/schema.prisma`                | Modele, relacje, unikalne indeksy, schemat PostgreSQL.                   |
| `prisma/migrations/`                  | Wersjonowana struktura bazy, uprawnienia i RLS.                          |
| `lib/db.ts`                           | Jeden klient Prisma zamiast nowych połączeń przy każdym hot reloadzie.   |
| `lib/auth.ts`                         | Providers, porównanie hasła, konfiguracja JWT, sprawdzanie wersji sesji. |
| `lib/auth-types.d.ts`                 | Typy `session.user.id` i `token.sessionVersion`.                         |
| `lib/require-user.ts`                 | Weryfikacja sesji i pobranie aktualnego użytkownika z serwera.           |
| `lib/actions.ts`                      | Mutacje wywoływane formularzami.                                         |
| `lib/zodSchemas.ts`                   | Wspólne reguły walidacji.                                                |
| `lib/rate-limit.ts`                   | Atomowy limit prób wspólny dla instancji serwera.                        |
| `lib/mail.ts`                         | Transport SMTP i treść wiadomości resetującej hasło.                     |
| `components/auth-form.tsx`            | Formularze, błędy, stan oczekiwania i przyciski.                         |
| `components/auth-shell.tsx`           | Wspólny wygląd publicznych stron konta.                                  |
| `components/ui/`                      | Komponenty shadcn/Radix przeniesione ze szablonu.                        |
| `app/api/auth/[...nextauth]/route.ts` | Endpointy Auth.js, np. sesja i callback Google.                          |
| `app/(auth)/`                         | Publiczne strony logowania, rejestracji i odzyskiwania hasła.            |
| `app/dashboard/page.tsx`              | Chroniona strona profilu i bezpieczeństwa.                               |
| `.env.example`                        | Lista potrzebnych zmiennych bez prawdziwych sekretów.                    |

Nawiasy w `(auth)` tworzą grupę organizacyjną. Adres to `/sign-in`, a nie
`/(auth)/sign-in`. Folder `[...nextauth]` przechwytuje wiele podścieżek API.

## 4. Rejestracja

Formularz pobiera nazwę, e-mail i dwa hasła. `useForm` uruchamia walidację przy
opuszczeniu pola i ponownie przy wpisywaniu. `useActionState` łączy formularz
z akcją serwerową, przechowuje jej wynik i informuje, czy żądanie trwa.

Serwer ponownie parsuje `FormData` przez `parseWithZod`. Walidacja w przeglądarce
pomaga użytkownikowi, ale nie jest zabezpieczeniem: można ją ominąć własnym HTTP.
Po poprawnej walidacji serwer sprawdza limit rejestracji, hashuje hasło przez
`bcrypt.hash(password, 12)` i zapisuje konto przez `prisma.user.create`.

Unikalność e-maila i nazwy gwarantuje baza. Obsługujemy `P2002`, zamiast polegać
wyłącznie na wcześniejszym `findUnique`, bo dwa żądania mogą nadejść jednocześnie.
Po sukcesie użytkownik trafia na `/sign-in?registered=1`.

Nazwy i e-maile są normalizowane. Hasła pozostają dokładnie takie, jak je wpisano:
spacje są ich częścią. bcrypt ma limit 72 bajtów UTF-8, więc walidacja mierzy
również bajty, a nie tylko liczbę znaków. Polskie znaki mogą zajmować więcej bajtów.

## 5. Logowanie i sesja

Akcja logowania przekazuje sprawdzone dane do `signIn("credentials", ...)`.
Provider `authorize` jeszcze raz waliduje dane, sprawdza limit, pobiera konto
po e-mailu lub nazwie i wykonuje asynchroniczne `bcrypt.compare`.
Hasło nie jest odszyfrowywane: porównujemy je z zapisanym hashem.

Po sukcesie Auth.js tworzy zaszyfrowany token sesji w ciasteczku HttpOnly.
Kod JavaScript strony nie odczyta go przez `document.cookie`.
W produkcji korzystaj z HTTPS i poprawnej konfiguracji domeny oraz proxy.
Nie ustawiamy bezwarunkowego `trustHost`; wdrożenie musi mieć zaufany nagłówek Host.

Wybraliśmy `session.strategy = "jwt"`, bo Credentials wymaga obsługi JWT.
Usunęliśmy obejście ze szablonu, które podmieniało funkcję kodującą token na
własny zapis sesji w bazie. Adapter Prisma nadal zapisuje użytkowników i konta OAuth.
Tabela `Session` pozostaje zgodna ze strukturą adaptera, ale w wybranej strategii
nie jest głównym magazynem sesji. `VerificationToken` przechowuje hashe linków resetu.

Przy odczycie sesji callback JWT sprawdza `sessionVersion` w bazie. Jeśli konto
usunięto albo zmieniono hasło, stary token jest odrzucany. Ta decyzja oznacza
dodatkowy odczyt z PostgreSQL, ale pozwala od razu unieważniać poprzednie sesje.
Nie zapisujemy całego rekordu użytkownika, hasha hasła ani tokenów Google
w danych zwracanych klientowi przez `/api/auth/session`.

## 6. Ochrona danych i panelu

`requireUser()` uruchamia `auth()`, a brak sesji powoduje `redirect("/sign-in")`.
Następnie pobiera użytkownika z bazy. Funkcja jest opakowana w `React.cache`,
który deduplikuje odczyty w obrębie renderowania; nie jest globalnym magazynem
sesji pomiędzy różnymi użytkownikami.

To sprawdzenie jest wywoływane zarówno w stronie, jak i akcjach edycji profilu
oraz hasła. Samo ukrycie przycisku lub ochrona layoutu nie zabezpiecza endpointu.
ID użytkownika pochodzi z sesji, a nie z ukrytego pola formularza.

Nie dodajemy `proxy.ts` wyłącznie do sprawdzania obecności ciasteczka: właściwa
kontrola odbywa się przy odczycie danych i wykonywaniu mutacji. Przy przyszłym
API również dodaj `requireUser()` albo równoważną weryfikację.

## 7. Google OAuth

Auth.js kieruje użytkownika do Google. Google potwierdza tożsamość i wraca
na `/api/auth/callback/google`. Biblioteka obsługuje protokół i zabezpieczenia
OAuth, a PrismaAdapter zapisuje użytkownika i rekord `Account`.

Nazwa wyświetlana z Google nie jest unikalnym loginem. Dlatego rozdzieliliśmy
`name` od unikalnego `username`. Nazwa konta OAuth może się powtarzać, a `username`
jest opcjonalne. Nie włączamy automatycznego łączenia kont po zgodnym e-mailu.

## 8. Zmiana i odzyskiwanie hasła

Zmiana w panelu wymaga obecnego hasła. Aktualizacja działa jako compare-and-set:
nie nadpisze hasła, jeśli równoległe żądanie już je zmieniło. W transakcji
unieważniamy linki resetu, zwiększamy wersję sesji i wylogowujemy użytkownika.

Przy odzyskiwaniu generujemy losowy UUID v4. W bazie jest tylko jego SHA-256.
Jednorazowy link trafia przez Nodemailer i SMTP do właściciela adresu.
Sam endpoint nie ujawnia, czy konto istnieje ani czy ma hasło zamiast Google.

Reset używa `DELETE ... RETURNING` wewnątrz transakcji: usunięcie ważnego tokenu
i aktualizacja hasła tworzą jedną operację. Dwa równoległe żądania nie wykorzystają
tego samego tokenu. Link wygasły lub już wykorzystany daje czytelny komunikat.

Ta implementacja nie wymaga potwierdzania e-maila przy rejestracji hasłem,
tak jak szablon. Jeśli przyszłe funkcje będą polegały na potwierdzonej własności
adresu, dodaj osobny proces weryfikacji; nie traktuj samego wpisanego e-maila
jako zweryfikowanego.

## 9. Ograniczanie prób i prywatna baza

`AuthRateLimit` trzyma liczbę prób i termin wygaśnięcia. `INSERT ... ON CONFLICT`
atomowo zwiększa licznik, zamiast używać podatnego na wyścigi „odczytaj, potem zapisz”.
Limity nie znikają po restarcie i działają wspólnie dla instancji aplikacji.
Klucze są HMAC-SHA-256, więc nie przechowujemy tam jawnych adresów.

- Logowanie: 8 prób na identyfikator / 15 minut.
- Rejestracja: 5 prób na e-mail / 15 minut.
- Wysyłanie resetu: 3 próby na e-mail / 15 minut.
- Używanie tokenu i zmiana hasła: po 5 prób / 15 minut.

To zabezpieczenie ogranicza próby na konkretne konto. Przed publicznym wdrożeniem
uzupełnij je limitem całego endpointu na zaufanej warstwie infrastruktury
oraz ewentualną ochroną przed botami. Samemu nagłówkowi `X-Forwarded-For`
przesłanemu przez dowolnego klienta nie wolno ufać.

Okresowo można usuwać wygasłe wpisy `AuthRateLimit` i `VerificationToken`.
Ich pozostawienie nie przywraca ważności, ale powiększa tabele.
Nie uruchamiamy automatycznego harmonogramu ani kolejnej usługi bez potrzeby.

Kontrola Supabase potwierdziła RLS na nowych tabelach i brak dostępu do schematu
`games_db` dla `anon` oraz `authenticated`. Doradca zgłasza informację o braku
polityk — jest to zamierzony model prywatnego dostępu serwerowego. W istniejącym
schemacie `public` projektu `postle` wykrył osobne ostrzeżenia widoczności tabel
w GraphQL. Ten raport nie potwierdza dostępu do konkretnych wierszy. Nie zmieniałem
uprawnień starej aplikacji; jej polityki i ekspozycja API wymagają osobnego przeglądu.

## 10. Biblioteki aplikacji

| Biblioteka                      | Do czego służy i jak jej używamy                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `next`                          | Routing, Server Components, Server Actions, metadane, renderowanie i endpointy HTTP.                                 |
| `react`, `react-dom`            | Komponenty UI, hooki, renderowanie; `useActionState` obsługuje formularze.                                           |
| `next-auth`                     | Auth.js: Credentials, Google OAuth, ciasteczka, JWT, `auth`, `signIn`, `signOut`. Wersja 5 nadal ma oznaczenie beta. |
| `@auth/prisma-adapter`          | Łączy cykl życia kont Auth.js z modelami Prisma.                                                                     |
| `@prisma/client`                | Typowane zapytania do PostgreSQL, np. `prisma.user.findUnique`.                                                      |
| `bcrypt`                        | Asynchroniczne hashowanie i porównywanie haseł; koszt 12.                                                            |
| `@conform-to/react`             | Stan formularza, identyfikatory pól, dostępność i mapowanie błędów.                                                  |
| `@conform-to/zod`               | `parseWithZod` i `submission.reply` łączą Zod z Conform; używamy eksportu `/v4`.                                     |
| `zod`                           | Schematy danych, np. `signUpSchema`, `safeParse` i zgodność obu haseł.                                               |
| `uuid`                          | Losowy UUID v4 do linku resetu hasła.                                                                                |
| `nodemailer`                    | Nowa zależność do wysyłki wiadomości przez SMTP.                                                                     |
| `server-only`                   | Powoduje błąd kompilacji przy przypadkowym imporcie modułu serwera do klienta.                                       |
| `next-themes`                   | Motyw jasny, ciemny i systemowy; zapisuje wybór użytkownika.                                                         |
| `lucide-react`                  | Ikony jako komponenty React, np. `Gamepad2`, `Eye`, `ShieldCheck`.                                                   |
| `@radix-ui/react-dropdown-menu` | Dostępne menu wyboru motywu, obsługa klawiatury i fokusu.                                                            |
| `@radix-ui/react-label`         | Dostępne etykiety pól w komponentach UI.                                                                             |
| `@radix-ui/react-separator`     | Separator pomiędzy logowaniem hasłem a Google.                                                                       |
| `@radix-ui/react-slot`          | `Button asChild`: styl przycisku na innym elemencie bez zagnieżdżania interaktywnych elementów.                      |
| `class-variance-authority`      | Definiuje warianty `Button`, np. `outline`, `ghost`, `size="icon"`.                                                  |
| `clsx`                          | Warunkowe składanie klas w funkcji `cn`.                                                                             |
| `tailwind-merge`                | Rozwiązuje konflikty klas Tailwind w `cn`, np. dwóch wartości paddingu.                                              |

shadcn/ui to skopiowany kod komponentów w `components/ui`, a nie osobna
zależność runtime. Możesz swobodnie edytować te pliki.

## 11. Narzędzia deweloperskie

| Narzędzie                                         | Rola                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `typescript`                                      | Sprawdza typy przed uruchomieniem kodu. `npm run typecheck`.                                    |
| `@types/node`, `@types/react`, `@types/react-dom` | Definicje typów środowiska i React.                                                             |
| `@types/bcrypt`, `@types/nodemailer`              | Definicje typów bibliotek JS.                                                                   |
| `prisma`                                          | CLI do generowania klienta, migracji i Studio.                                                  |
| `tailwindcss`                                     | Klasy pomocnicze i wspólny system kolorów oraz stanów UI.                                       |
| `@tailwindcss/postcss`                            | Standardowy procesor CSS; zastąpił eksperymentalny loader Turbopack z początkowej konfiguracji. |
| `tw-animate-css`                                  | Animacje komponentów Radix/shadcn, np. otwieranie menu.                                         |
| `eslint`, `eslint-config-next`                    | Reguły poprawności React i Next.js.                                                             |
| `tsx`                                             | Uruchamia skrypty i testy TypeScript bez ręcznej kompilacji.                                    |
| `ts-node`                                         | Zachowane narzędzie ze szablonu; obecne skrypty korzystają z `tsx`.                             |
| `prettier`                                        | Automatycznie formatuje kod; `npm run format`.                                                  |

W `package.json` są jawne `overrides` dla poprawionych wersji `nodemailer`
oraz zależności konfiguracyjnych Prisma 6: `effect` i `deepmerge-ts`.
Pozwalają zachować używany w szablonie główny numer Prisma i usunąć podatności.
Auth.js nie korzysta tu z providera e-mail, a własny SMTP jest testowany oddzielnie
od logowania Credentials. Przy przyszłym większym upgrade usuń override,
jeśli pakiety nadrzędne już deklarują bezpieczne wersje.
Lockfile zapisuje dokładne drzewo; używaj `npm ci` do jego odtworzenia.

## 12. Różnice względem starego szablonu

- Usunięta wzajemna rekurencja sprawdzania unikalności e-maila i nazwy.
- Zgodność haseł sprawdzana także w akcji serwera.
- Hasła nie są przycinane przez `trim()`.
- `bcrypt.hash` i `compare` są asynchroniczne, więc nie blokują pętli Node.js.
- Błędny login i nieistniejące konto mają wspólny komunikat.
- Wprowadzona zgodna z Credentials strategia JWT i kontrolowane unieważnianie.
- Konta Google mogą mieć powtarzające się nazwy wyświetlane.
- Nie kopiowano literówki `/sing-up`; używamy `/sign-up`.
- Dodane limity prób, reset, zmiana hasła i atomowe operacje bezpieczeństwa.
- Pola haseł i tokenów nie wracają do przeglądarki w wyniku `submission.reply`.
- Ochrona działa wewnątrz akcji, nie tylko w widoku strony.

## 13. Specyfika Next.js 16 w tym projekcie

`cookies()`, `headers()` i `searchParams` są asynchroniczne.
`redirect()` rzuca wewnętrzny wyjątek sterujący nawigacją: nie należy go łapać
i zamieniać w zwykły błąd formularza. Dlatego obsługujemy `AuthError`,
a pozostałe wyjątki z `signIn` przekazujemy Next.js.

Projekt ma włączone Cache Components. Sekcje zależne od żądania są za `Suspense`,
a `connection()` przed odczytem sesji wyklucza kod Auth.js z prerenderingu,
w którym losowe operacje kryptograficzne są niedozwolone.
Roku w stopce nie odczytujemy bezpośrednio w statycznym renderowaniu:
ma osobny komponent z `"use cache"`. Nie cache'ujemy współdzielonej sesji użytkownika.

## 14. Jak rozwijać projekt

1. Dodając chronioną stronę, zacznij od `const user = await requireUser()`.
2. Dodając mutację, sprawdzaj użytkownika także w samej akcji i waliduj wejście.
3. Dane gier powiąż z `userId`; każda operacja musi ograniczać zapytanie do właściciela.
4. Zmieniając modele, utwórz nową migrację. Nie zmieniaj zastosowanej migracji.
   `prisma migrate dev` wymaga osobnej deweloperskiej bazy i shadow database;
   nie uruchamiaj go bez przygotowania na współdzielonej bazie `postle`.
5. Przed wdrożeniem skonfiguruj SMTP, Google, HTTPS, role bazy i limity infrastruktury.
6. Uruchom testy oraz build; sprawdź ręcznie Google na własnym koncie i dostarczanie poczty.

Przydatne dokumentacje: [Auth.js Credentials](https://authjs.dev/getting-started/providers/credentials),
[PrismaAdapter](https://authjs.dev/getting-started/adapters/prisma),
[Supabase i Prisma](https://supabase.com/docs/guides/database/prisma),
[Next.js authentication](https://nextjs.org/docs/app/guides/authentication),
[Nodemailer SMTP](https://nodemailer.com/smtp).
