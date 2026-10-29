# Szczegóły gry i lista ogranych

## Dane z IGDB

`/games/ID` pobiera opis (`summary`), pierwszą datę premiery, platformy, gatunki,
oceny graczy (`rating`), krytyków (`aggregated_rating`), ocenę łączną
(`total_rating`) oraz liczbę głosów dla każdej oceny. Wyniki 0–100 prezentujemy
w skali 0–10. Brak oceny nie oznacza zera. Data jest formatowana po polsku w UTC.
Opis pozostaje w oryginalnym języku IGDB i jest renderowany jako zwykły tekst.

`screenshots.image_id` pozwala utworzyć adresy obrazów. Weryfikujemy identyfikatory,
usuwamy powtórzenia i wyświetlamy najwyżej 3 screenshoty. Bez obrazów sekcja
jest pomijana. Kliknięcie otwiera większą wersję w nowej karcie.
Pozostałe brakujące pola mają komunikaty zastępcze.

`gameDetailsSchema` sprawdza odpowiedź. `getGameDetails` cache'uje publiczne
dane przez profil `hours`. Stan „Ograne” jest pobierany oddzielnie z sesji
i bazy, poza wspólnym cache'em IGDB.

## Modele PostgreSQL

Migracja `20261029161443_played_games` dodaje w schemacie `games_db`:

| Model        | Zawartość                                                                             |
| ------------ | ------------------------------------------------------------------------------------- |
| `Game`       | ID z IGDB jako klucz główny, tytuł, ID okładki, pierwszą datę premiery i daty zapisu. |
| `PlayedGame` | `userId`, `gameId`, `addedAt` — powiązanie gracza z oznaczoną grą.                    |

Relacja wiele-do-wielu ma pola `User.playedGames` i `Game.playedBy`.
Klucz `(userId, gameId)` uniemożliwia duplikaty na jednej liście. Ta sama gra
może należeć do list wielu osób. Klucze obce zapewniają integralność;
usunięcie użytkownika usuwa jego powiązania. Indeksy wspierają odczyt po
właścicielu i dacie oraz operacje klucza obcego po `gameId`.

Pełnych opisów nie kopiujemy do PostgreSQL. Minimalny snapshot `Game` powstaje
dopiero podczas oznaczania gry. Dzięki temu profil nie odpytuje IGDB osobno
o każdą kartę. Cofnięcie oznaczenia usuwa tylko własny `PlayedGame`, a nie
współdzielony rekord gry.

## Kliknięcie „Ograne”

1. `PlayedControl` sprawdza sesję. Gość otrzymuje link do logowania.
2. `PlayedButton` pokazuje własny aktualny stan oraz stan oczekiwania podczas zapisu.
3. `useActionState` wywołuje `setPlayedGame` z ID gry i docelowym `true`/`false`.
4. Akcja ponownie sprawdza użytkownika przez `requireUser()` i waliduje wejście Zod.
5. Przy dodawaniu pobiera prawdziwe dane IGDB; ignoruje przesłany tytuł,
   okładkę i `userId`. Właściciel zawsze pochodzi z sesji.
6. Transakcja wykonuje `upsert` gry i powiązania. Ponowne dodanie nie tworzy duplikatu.
7. Usunięcie ogranicza zapytanie do użytkownika z sesji i nie wymaga połączenia z IGDB.
8. `revalidatePath` odświeża szczegóły i profil po zmianie.

Przycisk ma `aria-pressed`, opisy czynności i komunikaty dostępne dla czytników.

## Profil

### Gry przed premierą

Gra z datą premiery późniejszą niż dzisiejsza nie może zostać oznaczona jako
ograna, oceniona ani przeniesiona z planowanych do ogranych. Przyciski są
zablokowane, formularz oceny ukryty, a serwer ponownie sprawdza warunek przed
zapisem, również przy ręcznym przesłaniu żądania. Usuwanie wcześniejszych
oznaczeń pozostaje dostępne. Lista „Chcę zagrać” działa normalnie.

`lib/game-release.ts` porównuje dzień premiery IGDB (UTC, zgodnie z wyświetlaną
datą) z dzisiejszym dniem w `Europe/Warsaw`. Gra jest dostępna przez cały dzień
premiery, niezależnie od godziny w znaczniku czasu. Brak daty nie uruchamia
blokady. Zapisy ocen korzystają z warunku daty w samym zapytaniu aktualizującym.
Zmiana korzysta z istniejącego `Game.firstReleaseDate` i nie wymaga migracji.

### Własna ocena 1–10

Ogranej grze można wystawić własną, całkowitą ocenę od 1 do 10, a później
zmienić ją zarówno na stronie gry, jak i w profilu. Formularz pokazuje aktualną
ocenę oraz przycisk „Zapisz”. Nie wpływa to na oceny pobierane z IGDB.

Migracja `20261029163456_personal_game_ratings` dodaje opcjonalne pole
`PlayedGame.rating` (`Int?`). Dotychczasowe wpisy mają `null`, czyli brak oceny.
Ograniczenie CHECK w PostgreSQL dopuszcza wyłącznie `null` albo zakres 1–10.
Zod waliduje dane także przed zapisem na serwerze.

Akcja `setGameRating` używa sesji i atomowego `updateMany` z warunkami
`userId` i `gameId`. Bez własnego wpisu „Ograne” aktualizacja jest odrzucana;
akcja nie tworzy takiego wpisu automatycznie. Przekazanie cudzego `userId`
nie zmienia właściciela. Po zapisie odświeżane są profil i strona gry.

Ponowne oznaczenie tej samej gry zachowuje ocenę. Cofnięcie „Ograne” usuwa
cały wpis wraz z oceną; ponowne dodanie zaczyna się bez oceny.

`/dashboard#played-games` pokazuje licznik, okładki, tytuły oraz daty dodania.
Można otworzyć szczegóły i cofnąć oznaczenie. Lista ma 12 gier na stronę;
wszystkie kolejne gry są dostępne przez `?playedPage=2#played-games`.
Domyślnie lista pokazuje najnowsze oznaczenia. Nad listą znajduje się pole
wyszukiwania po fragmencie tytułu (bez rozróżniania wielkości liter) oraz
sortowanie według własnej oceny, nazwy lub daty dodania — każde w obu kierunkach.
Po wybraniu ustawień kliknij „Zastosuj”. Gry bez oceny są zawsze na końcu
sortowania według oceny. Wyszukiwanie obejmuje całą własną kolekcję, zanim
serwer podzieli wyniki na strony. Znaki `%`, `_` i `\` są traktowane dosłownie.

Parametry `playedQ` i `playedSort` w adresie zachowują ustawienia przy
przechodzeniu między stronami, odświeżeniu i powrocie w historii przeglądarki.
Zmiana filtrów zaczyna od pierwszej strony. Link „Wyczyść wyszukiwanie”
usuwa frazę i zachowuje wybrane sortowanie. Licznik obok nagłówka pokazuje
całą kolekcję, a komunikat pod formularzem — liczbę pasujących wyników.
Zapytania Prisma nadal ograniczają każdy wynik do użytkownika z sesji;
ta zmiana korzysta z istniejących pól i nie wymaga migracji bazy.
Numer poza zakresem jest ograniczany do ostatniej strony, także po usunięciu
ostatniego wpisu z danej strony.

### Lista „Chcę zagrać”

Na stronie szczegółów nieogranej gry zalogowany użytkownik ma przycisk
„Chcę zagrać”. Kolejne kliknięcie usuwa grę z planowanych. Na profilu osobna
sekcja `/dashboard#wishlist-games` pokazuje okładki, tytuły i daty dodania,
od najnowszych. Lista ma 12 gier na stronę (`wantedPage` w adresie).

Przy każdej planowanej grze są przyciski „Przenieś do ogranych” i „Usuń z listy”.
Przeniesienie tworzy własny `PlayedGame` i usuwa własny `WishlistGame` w jednej
transakcji. Gra pojawia się w ogranych bez oceny — można ją później wystawić.
Oznaczenie planowanej gry jako „Ograne” bezpośrednio na stronie gry również
usuwa ją z planowanych. Gra już ograna nie może ponownie trafić na listę
„Chcę zagrać”, dopóki użytkownik nie cofnie oznaczenia „Ograne”.

Model `WishlistGame` zawiera `userId`, `gameId`, `addedAt`, klucz złożony
uniemożliwiający duplikaty oraz indeksy dla listy właściciela i klucza obcego.
Wykorzystuje ten sam zapis `Game` co ograne. Migracja
`20261029170116_wishlist_games` dodaje tabelę, klucze obce, indeksy, RLS oraz
odbiera dostęp rolom `PUBLIC`, `anon` i `authenticated`. Została zastosowana
w projekcie Supabase `games-db`; istniejące dane pozostają zachowane.

`setWishlistGame` sprawdza sesję przez `requireUser()` i waliduje ID oraz
operację przez Zod. Właściciel pochodzi wyłącznie z sesji. Przy dodawaniu
tytuł i okładka pochodzą z IGDB; przeniesienie i usuwanie używają zapisanych
danych, więc nie wymagają dostępności IGDB. Transakcje dodawania i przenoszenia
blokują wiersz użytkownika przez `SELECT ... FOR UPDATE`, zanim zmienią listy.
Dzięki temu równoczesne żądania nie dodadzą tej samej gry na obie listy.
Blokada trwa tylko podczas operacji w bazie, bez oczekiwania na API.
Ponowne przeniesienie jest bezpieczne i nie resetuje istniejącej oceny.

Komponent serwerowy `WishlistGamesList` pobiera tylko własne wpisy i przekazuje
przyciski do małego komponentu klienckiego `WishlistButton`. `useActionState`
obsługuje oczekiwanie i komunikaty wyniku; `revalidatePath` odświeża profil
i szczegóły po zapisie. Nie dodano nowych bibliotek.

## Ochrona danych

Każdy odczyt i usunięcie zawiera `userId` zweryfikowanej sesji. Sama obecność
przycisku nie jest zabezpieczeniem — akcja również wymaga zalogowania.
List użytkowników nie przechowujemy w globalnym cache'u.

Tabele `Game`, `PlayedGame` i `WishlistGame` mają RLS. Role `anon`, `authenticated` i `PUBLIC` nie mają
do nich uprawnień. Serwer łączy się przez Prisma, tak jak istniejąca autoryzacja.
Brak polityk RLS jest celowy w modelu prywatnego dostępu serwerowego.
To Auth.js sprawdza tożsamość; konta aplikacji nie są kontami Supabase Auth.

Migracja jest zastosowana wyłącznie w projekcie Supabase `games-db`.
W innych środowiskach uruchom `npm run db:generate` oraz `npm run db:migrate`.
Na Windows zatrzymaj dev server przed generowaniem Prisma, jeżeli blokuje plik DLL.

## Weryfikacja

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
# Z działającym lokalnym serwerem:
npm run test:played
```

Test integracyjny tworzy dwa fikcyjne konta i korzysta z prawdziwych akcji HTTP.
Sprawdza dane IGDB, screenshoty, blokadę gościa, zapis, brak duplikatów,
ignorowanie podmienionego `userId` i tytułu, izolację list, usuwanie z profilu
i paginację 13 wpisów. Sprawdza też wszystkie kierunki sortowania,
brak ocen na końcu, wyszukiwanie bez rozróżniania wielkości liter,
dosłowne znaki specjalne i zachowanie filtrów podczas paginacji.
W `finally` usuwa wyłącznie własne dane testowe.
Nie wysyła e-maili.

Test obejmuje również dodawanie i usuwanie planowanych, blokadę gościa,
próbę przeniesienia cudzej gry, ponowne przeniesienie, równoczesne dodawanie
do obu list, niezależną paginację planowanych oraz przeniesienie zapisu,
którego ID nie istnieje w IGDB (potwierdzenie braku zależności od API).
