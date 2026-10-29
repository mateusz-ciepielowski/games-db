# GamesDB

Sekcja konta gracza w Next.js 16, oparta na `full-authentication-template`.
Interfejs po polsku, responsywny układ, jasny i ciemny motyw.

Strona główna `/` to publiczny katalog IGDB: siatka okładek, wyszukiwanie tytułów,
sortowanie i paginacja. Kliknięcie karty otwiera pełne szczegóły pod `/games/ID`.
Zalogowani użytkownicy mogą oznaczać gry jako „Ograne” lub „Chcę zagrać”
i przeglądać osobne listy na profilu. Planowaną grę można przenieść do ogranych,
a następnie wystawić własną ocenę 1–10. Lista ogranych obsługuje wyszukiwanie i sortowanie.
Opis modeli i funkcji: [docs/OGRANE-I-SZCZEGOLY.md](docs/OGRANE-I-SZCZEGOLY.md).
Konfiguracja API i omówienie kodu: [docs/IGDB.md](docs/IGDB.md).

## Co działa

- Rejestracja: nazwa gracza, e-mail, hasło i jego potwierdzenie.
- Logowanie nazwą gracza lub e-mailem oraz hasłem.
- Logowanie Google po skonfigurowaniu aplikacji OAuth.
- Chroniony panel `/dashboard`, zmiana nazwy wyświetlanej i wylogowanie.
- Zmiana hasła po potwierdzeniu obecnego, z unieważnieniem wcześniejszych sesji i linków resetu.
- Odzyskiwanie hasła przez SMTP: jednorazowy link ważny 30 minut.
- Walidacja po obu stronach, bcrypt, trwałe limity prób w PostgreSQL.

## Uruchomienie

```powershell
npm ci
Copy-Item .env.example .env # tylko jeśli nie masz jeszcze .env
# Uzupełnij .env zgodnie z instrukcją poniżej.
npm run db:generate
npm run db:migrate
npm run dev
```

Otwórz http://localhost:3000. Lokalny `.env` jest ignorowany przez Git.
Docelowa baza to osobny projekt Supabase **games-db** (`oiaaejqnckqdvdautzbb`).
Stare połączenia z `postle` zostały usunięte z lokalnej konfiguracji.
Uzupełnij `DATABASE_URL` i `DIRECT_URL` z panelu Connect nowego projektu,
a następnie uruchom `npm run db:migrate`. Kod blokuje inne projekty.
Klucze Google pochodzą z konfiguracji szablonu; poczta Gmail wymaga hasła do aplikacji.

Instrukcja krok po kroku: [SMTP Gmail i osobna baza Supabase](docs/KONFIGURACJA-SMTP-I-SUPABASE.md).

## Supabase i PostgreSQL

To **Auth.js obsługuje logowanie**, a **Supabase hostuje PostgreSQL**. Prisma
łączy się z bazą z serwera. Konta tej aplikacji są w `games_db.User`, a nie
w `auth.users` Supabase Auth. Dlatego nie potrzebujesz klucza `anon`,
`service_role` ani klienta `@supabase/supabase-js` w przeglądarce.

W Supabase otwórz **Connect**:

1. `DATABASE_URL`: Transaction pooler, port 6543, parametry
   `pgbouncer=true&connection_limit=1&schema=games_db&sslmode=require`.
2. `DIRECT_URL`: Session pooler, port 5432, parametry
   `schema=games_db&sslmode=require`. Prisma CLI używa tego połączenia do migracji.
3. Hasło bazy w URL musi być zakodowane jako składnik URL, np. `@` → `%40`.
4. Nie dodawaj `games_db` do schematów udostępnianych przez Supabase Data API.

Migracja włącza RLS i odbiera rolom `anon`, `authenticated` oraz `PUBLIC`
dostęp do schematu i tabel. Brak polityk jest celowy: przeglądarka nie powinna
czytać tabel kont. Serwer używa połączenia bazy z uprawnieniami właściciela,
tak jak szablon. Przed wdrożeniem produkcyjnym warto wydzielić rolę aplikacji
z dostępem tylko do `games_db` i właściwymi politykami dla tej roli.

```powershell
npm run db:check   # połączenie, aktualny schemat i liczba kont
npm run db:studio  # graficzny podgląd tabel; nie udostępniaj go publicznie
```

## Sekret sesji

Wygeneruj osobny sekret dla każdego środowiska:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Wklej wynik do `AUTH_SECRET`. `AUTH_URL` lokalnie to `http://localhost:3000`,
a w produkcji pełny adres HTTPS. Nie kopiuj `.env` do repozytorium.

## Google OAuth

W Google Cloud Console utwórz klienta **OAuth 2.0 → Web application**.
Ustaw ekran zgody i użytkowników testowych, jeśli aplikacja ma tryb testowy.

- Authorized JavaScript origin: `http://localhost:3000`.
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
- `AUTH_GOOGLE_ID`: Client ID.
- `AUTH_GOOGLE_SECRET`: Client secret.

W produkcji dodaj odpowiedni callback pod domeną HTTPS. Zrestartuj serwer po
zmianie zmiennych. Gdy brakuje kluczy, przycisk Google jest nieaktywny.
Konta nie są automatycznie łączone tylko dlatego, że mają ten sam e-mail.
Istniejący użytkownik powinien użyć pierwotnej metody logowania.

## Poczta i reset hasła

Uzupełnij `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_FROM` oraz prawidłowe `AUTH_URL`.

- Port 587 zwykle korzysta ze STARTTLS: `SMTP_SECURE=false`.
- Port 465 zwykle korzysta z TLS od początku: `SMTP_SECURE=true`.
- `SMTP_FROM` musi być adresem dozwolonym przez dostawcę poczty.
- Lokalnie używaj skrzynki testowej lub lokalnego serwera SMTP.

Nodemailer wysyła link `/reset-password?token=...`. Baza przechowuje wyłącznie
SHA-256 tokenu. Po 30 minutach lub pierwszym użyciu link przestaje działać.
Zmiana hasła zwiększa `sessionVersion`, więc także kopia starego ciasteczka
przestaje zapewniać dostęp. Zwykłe wylogowanie usuwa sesję w bieżącej przeglądarce.

Bez SMTP formularz jasno informuje, że odzyskiwanie nie jest dostępne.
Po skonfigurowaniu SMTP odpowiedź nie ujawnia, czy podany e-mail istnieje.
Błąd wysyłki jest sygnalizowany w logach serwera bez adresu i tokenu;
w produkcji należy monitorować te błędy.

## Weryfikacja

```powershell
npm run test
npm run test:mail # lokalny SMTP; nie wysyła prawdziwej poczty
npm run typecheck
npm run lint
npm run build
npm audit
```

Test integracyjny wymaga działającej lokalnej aplikacji i bazy:

```powershell
# Terminal 1
npm run dev
# Terminal 2
npm run test:integration
```

Test tworzy fikcyjne konto `qa_...@example.invalid`, przechodzi przez prawdziwe
akcje serwerowe i usuwa własne dane w `finally`. Sprawdza rejestrację, błędne
i poprawne logowanie, panel, profil, zmianę hasła, unieważnianie sesji, reset,
ponowne użycie i wygaśnięcie tokenu, wylogowanie oraz limit prób.
Nie loguje się do zewnętrznego Google i nie wysyła prawdziwych e-maili.

## Dalsza nauka

Szczegółowe omówienie plików, przepływu danych, każdej biblioteki, poprawek
względem szablonu i ćwiczeń: [docs/AUTORYZACJA.md](docs/AUTORYZACJA.md).
