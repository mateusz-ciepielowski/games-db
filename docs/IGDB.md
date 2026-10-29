# Katalog gier i konfiguracja IGDB

Strona `/` jest publicznym katalogiem gier. Pokazuje 24 okładki na stronę,
wyszukiwanie, sortowanie i paginację. Każda karta prowadzi do `/games/ID`.
Pod tym adresem jest pełna karta: opis, premiera, platformy, gatunki, oceny
i maksymalnie 3 screenshoty. Zalogowany gracz może dodać grę do ogranych.
Modele bazy i cały przepływ opisano w [OGRANE-I-SZCZEGOLY.md](OGRANE-I-SZCZEGOLY.md).

## Konfiguracja

W ignorowanym przez Git `.env` są ustawione przekazane dane:

```dotenv
IGDB_CLIENT_ID="client_id_aplikacji_twitch"
IGDB_ACCESS_TOKEN="token_bez_prefiksu_Bearer"
IGDB_CLIENT_SECRET=""
```

Nie dodawaj prefiksu `NEXT_PUBLIC_`. Serwer dodaje `Bearer` do nagłówka sam.
Po zmianie `.env` zrestartuj lokalny serwer. W środowisku produkcyjnym ustaw
te same zmienne u dostawcy hostingu.

```powershell
npm run igdb:check
```

Ta komenda wykonuje prawdziwe zapytanie do IGDB i pokazuje kilka tytułów.
Nie wyświetla tokenu ani nagłówków autoryzacji.

## Dlaczego zapytanie wykonuje serwer

IGDB nie udostępnia bezpośrednich zapytań z przeglądarki przez CORS.
Serwer Next.js wysyła POST do stałego adresu `https://api.igdb.com/v4/games`:

```text
Client-ID: wartość IGDB_CLIENT_ID
Authorization: Bearer wartość IGDB_ACCESS_TOKEN
Content-Type: text/plain
```

Body to zapytanie APICalypse, np.:

```text
fields id,name,cover.image_id,first_release_date,total_rating,genres.name;
search "The Witcher";
where version_parent = null;
limit 25;
offset 0;
```

Przeglądarka dostaje wyrenderowane karty i publiczne adresy obrazków.
Token i klient HTTP pozostają na serwerze dzięki `server-only`.
Nie trzeba dodawać kolejnej biblioteki: używamy wbudowanego `fetch`.

## Jak działa strona

1. Formularz `next/form` zapisuje tytuł w URL: `/?q=The+Witcher`.
2. Strona odczytuje asynchroniczne `searchParams` i normalizuje wartości.
3. `getGames` sprawdza cache Next.js, a przy braku danych odpytuje IGDB.
4. Zod sprawdza strukturę odpowiedzi, zanim trafi ona do interfejsu.
5. `GameCard` pokazuje okładkę, tytuł, rok premiery, pierwszy gatunek i ocenę.

Ocena IGDB jest dzielona przez 10, więc wynik ma skalę 0–10. Brak oceny nie
jest zamieniany na zero. Przy braku okładki wyświetlany jest neutralny zamiennik.

Wyszukiwanie korzysta z `search`, które sortuje odpowiedzi według podobieństwa.
Dlatego w wynikach wyszukiwania nie narzucamy dodatkowego `sort`.
Przekazana fraza jest cytowana i ograniczona do 100 znaków, aby nie mogła
dopisywać własnych instrukcji APICalypse.

Sortowanie katalogu bez frazy:

- **Popularne** — według liczby ocen (`total_rating_count`), a nie trendów sprzedaży.
- **Najwyżej oceniane** — według oceny, z minimum 50 ocenami, aby pojedynczy głos nie wygrywał rankingu.
- **Najnowsze premiery** — według daty premiery, bez przyszłych premier.

Katalog domyślny pomija dodatkowe edycje (`version_parent`) i pozycje bez
okładki. Wyszukiwanie dopuszcza brak okładki, żeby nie gubić mniej znanych gier.

## Paginacja i wydajność

`limit 25` pobiera 24 gry oraz jedną dodatkową, dzięki której wiemy, czy pokazać
„Następna”. Unikamy osobnego żądania do endpointu liczącego wszystkie gry.
Kolejne strony używają `offset = (page - 1) * 24`; na tym etapie udostępniamy
maksymalnie 100 stron dla jednej frazy i sortowania.

`use cache` ma ustawione `stale: 60`, `revalidate: 300`, `expire: 3600`.
Zapytanie, strona i sortowanie tworzą osobne wpisy. Po 5 minutach kolejny odczyt
może odświeżyć dane w tle; po godzinie dane wymagają ponownego pobrania.
Karta gry korzysta z profilu cache `hours`.

IGDB ma limit 4 żądań na sekundę i 8 jednocześnie otwartych żądań. Klient
szereguje zapytania z odstępem minimum 275 ms. Jest to limit dla jednego procesu.
Przy wdrożeniu wielu instancji potrzebny będzie wspólny limiter, np. oparty
o Redis, bo wszystkie instancje korzystają z tego samego limitu konta IGDB.
Odpowiedź 429 wyświetla czytelny komunikat; aplikacja nie ponawia jej w pętli.

Okładki korzystają z `next/image`, rozmiarów responsywnych i lazy loadingu.
Dozwolony host to wyłącznie `images.igdb.com/igdb/image/upload/`.
Prefetch kart i linków paginacji jest wyłączony, żeby samo przewijanie katalogu
nie wykonywało zapytań o wszystkie strony gier.

## Automatyczne odnawianie dostępu

Obecny ręcznie przekazany token ma określoną ważność. Do automatycznej obsługi
uzupełnij **opcjonalne** `IGDB_CLIENT_SECRET`, pobrane z tej samej aplikacji
w [Twitch Developer Console](https://dev.twitch.tv/console/apps).
Jest to inny sekret niż Google OAuth i SMTP.

Po ustawieniu sekretu klient używa przepływu `client_credentials`:

1. Wysyła dane aplikacji do `https://id.twitch.tv/oauth2/token` w body POST.
2. Przechowuje token tylko w pamięci serwera, do czasu wskazanego przez `expires_in`.
3. Pobiera nowy token przed wygaśnięciem, z zapasem 60 sekund.
4. Po odpowiedzi 401 usuwa zapamiętany token i ponawia żądanie dokładnie raz.

Bez sekretu używany jest `IGDB_ACCESS_TOKEN`. Po jego wygaśnięciu wpisz nowy
token do `.env` i zrestartuj serwer albo skonfiguruj sekret. Nie ma potrzeby
wklejania sekretu do czatu.

## Pliki i testy

| Plik                      | Odpowiedzialność                                           |
| ------------------------- | ---------------------------------------------------------- |
| `lib/igdb/client.ts`      | Autoryzacja, timeout, kolejka żądań i klasyfikacja błędów. |
| `lib/igdb/queries.ts`     | Budowanie zapytań, normalizacja URL i modele Zod.          |
| `lib/igdb/catalog.ts`     | Cache katalogu i podglądu pojedynczej gry.                 |
| `components/catalog/`     | Nagłówek, wyszukiwarka, karty, wyniki i skeleton.          |
| `app/page.tsx`            | Składanie strony głównej.                                  |
| `app/catalog.css`         | Wygląd katalogu i responsywność.                           |
| `app/games/[id]/page.tsx` | Pełna karta i weryfikacja identyfikatora gry.              |

```powershell
npm run test       # walidacja parametrów, cytowanie zapytań i pozostałe testy projektu
npm run test:igdb  # mock sieci: nagłówki, 401/429, odnowienie i ponowne użycie tokenu
npm run igdb:check # prawdziwe połączenie z IGDB
npm run typecheck
npm run lint
npm run build
```

Dane szczegółowe gier pobieramy z IGDB. Po oznaczeniu „Ograne” zapisujemy
w PostgreSQL minimalną kopię tytułu, identyfikatora okładki i daty premiery
oraz osobne powiązanie z użytkownikiem. Profil korzysta z tej kopii.

Źródła: [IGDB API](https://api-docs.igdb.com/),
[Twitch — Client Credentials](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow),
[Next.js — Cache Components](https://nextjs.org/docs/app/api-reference/directives/use-cache).
