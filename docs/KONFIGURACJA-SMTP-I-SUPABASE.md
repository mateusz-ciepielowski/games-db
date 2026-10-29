# Konfiguracja Gmail SMTP i osobnego projektu Supabase

## Aktualny stan

- Docelowy projekt Supabase: **games-db**, ID `oiaaejqnckqdvdautzbb`.
- Połączenia z poprzednim projektem `postle` usunięto z konfiguracji lokalnej.
- Nie zmieniano ani nie usuwano danych starej aplikacji. Pozostały tam tabele
  utworzone w poprzednim etapie; ich ewentualne usunięcie to osobna operacja.
- Nowy projekt ma zastosowaną migrację autoryzacji; Prisma nie zgłasza oczekujących migracji.
- Test SMTP potwierdził połączenie i logowanie do Gmaila.
- Wysyłka i doręczanie wiadomości zostały również potwierdzone przez użytkownika.

## 1. Wybierz nową bazę

Otwórz [projekt games-db](https://supabase.com/dashboard/project/oiaaejqnckqdvdautzbb).
Kliknij **Connect** i wybierz **Transaction pooler**. Skopiuj cały connection
string do `DATABASE_URL` w `.env`. Zastąp `[YOUR-PASSWORD]` hasłem bazy, które
ustawiłeś podczas tworzenia **tego nowego projektu**.

Hasło bazy jest inne niż hasło do konta Supabase i inne niż klucze API.
Jeśli go nie pamiętasz, w ustawieniach Database nowego projektu użyj opcji
resetowania hasła bazy. Nie zmieniaj hasła projektu `postle`.

Connection string powinien mieć login `postgres.oiaaejqnckqdvdautzbb`, port
`6543` i parametry `pgbouncer=true&connection_limit=1&schema=games_db&sslmode=require`.
Host skopiuj dokładnie z Connect — nie wyliczaj go z nazwy regionu.

Następnie wybierz **Session pooler** i skopiuj string do `DIRECT_URL`.
Port to `5432`, a parametry `schema=games_db&sslmode=require`.

```dotenv
DATABASE_URL="postgresql://postgres.oiaaejqnckqdvdautzbb:ZAKODOWANE_HASLO@HOST_Z_CONNECT:6543/postgres?pgbouncer=true&connection_limit=1&schema=games_db&sslmode=require"
DIRECT_URL="postgresql://postgres.oiaaejqnckqdvdautzbb:ZAKODOWANE_HASLO@HOST_Z_CONNECT:5432/postgres?schema=games_db&sslmode=require"
```

Powyższy `HOST_Z_CONNECT` jest miejscem do zastąpienia, a nie prawdziwym hostem.
Znaki specjalne w samym haśle zakoduj jako składnik URL, np. `@` → `%40`,
`#` → `%23`, `%` → `%25`. Nie koduj całego URL. Hasła nie wklejaj do czatu
ani internetowego narzędzia do kodowania.

Sprawdź również `.env.local`, jeśli go używasz: Next.js daje mu pierwszeństwo
przed `.env`. Nie pozostawiaj w nim starych URL-i.

W katalogu aplikacji uruchom:

```powershell
npm run db:generate
npm run db:migrate
npm run db:check
```

`db:migrate` najpierw weryfikuje projekt w obu URL-ach, a dopiero potem
uruchamia Prisma Migrate. Powstaną tabele w prywatnym schemacie `games_db`
wewnątrz nowego projektu. `db:check` powinno pokazać schemat `games_db` i liczbę kont.
Nie przenosimy użytkowników ze starej aplikacji; w nowej bazie utworzysz nowe konto.
Nie dodawaj schematu `games_db` do Supabase Data API.

## 2. Wygeneruj hasło Gmail do aplikacji

Na koncie Gmail, z którego mają wychodzić wiadomości:

1. Otwórz [ustawienia bezpieczeństwa Google](https://myaccount.google.com/security).
2. Włącz **Weryfikację dwuetapową**, jeśli jest wyłączona.
3. Otwórz [Hasła do aplikacji](https://myaccount.google.com/apppasswords).
4. Nazwij nowe hasło `GamesDB SMTP`.
5. Wygenerowany kod zapisz w `.env` jako `SMTP_PASSWORD`, bez spacji użytych
   przez Google do wizualnego grupowania znaków.

To hasło do aplikacji, a nie główne hasło konta Google. Nie jest też sekretem
klienta Google OAuth. Sam przycisk „Zaloguj się przez Google” w naszej aplikacji
nie daje jej dostępu do wysyłania wiadomości przez Twoją skrzynkę.

Jeśli opcji brakuje, przyczyną może być polityka konta organizacji,
Ochrona zaawansowana lub określona konfiguracja weryfikacji dwuetapowej.
Po zmianie głównego hasła Google wcześniejsze hasła do aplikacji są unieważniane.

## 3. Uzupełnij SMTP w .env

```dotenv
AUTH_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="twoj.adres@gmail.com"
SMTP_PASSWORD="TUTAJ_HASLO_DO_APLIKACJI"
SMTP_FROM="GamesDB <twoj.adres@gmail.com>"
```

`SMTP_USER` to pełny adres skrzynki. W `SMTP_FROM` na początek użyj tego samego
adresu. Nazwę `GamesDB` zobaczy odbiorca jako nazwę nadawcy.
Port 465 zestawia TLS od początku. Hasło trafi wyłącznie do serwera Gmail.

Dane SMTP wpisujesz w konfiguracji naszej aplikacji. Nie trzeba ustawiać
Supabase Authentication → SMTP: ten panel obsługuje wiadomości Supabase Auth,
a nasze wiadomości wysyła Nodemailer z serwera Next.js.

## 4. Sprawdź połączenie i prawdziwy reset

```powershell
npm run smtp:check
```

Komenda sprawdza połączenie i logowanie do SMTP. Nie wysyła wiadomości,
nie sprawdza też jeszcze jej doręczenia do skrzynki.

Zrestartuj serwer: zatrzymaj `npm run dev` przez Ctrl+C i uruchom ponownie.
Samo odświeżenie strony nie gwarantuje przeładowania klienta bazy z nowym URL.

1. Utwórz konto przez `/sign-up`, używając własnego prawdziwego e-maila i hasła.
2. Wejdź na `/forgot-password` i podaj ten e-mail.
3. Sprawdź pocztę oraz Spam; otwórz link w ciągu 30 minut.
4. Ustaw nowe hasło i sprawdź logowanie.
5. Ponowne użycie linku powinno zostać odrzucone.

Konto utworzone wyłącznie przez Google nie ma lokalnego hasła i nie otrzyma
tego rodzaju resetu. Hasłem takiego konta zarządza Google.
Odpowiedź formularza celowo nie ujawnia, czy konto istnieje. Gdy wiadomości
nie ma, sprawdź terminal Next.js i wynik `smtp:check`.

`AUTH_URL` określa adres linku. Przy localhost link otwieraj na komputerze
z uruchomioną aplikacją. Po wdrożeniu ustaw domenę HTTPS i dodaj zmienne
środowiskowe u dostawcy hostingu.

## Najczęstsze problemy

- `EAUTH`: zły adres lub hasło aplikacji, unieważnione hasło albo blokada konta Google.
- Timeout: port 465 może być blokowany w sieci; alternatywą jest port 587 i `SMTP_SECURE=false` (STARTTLS).
- Prisma `P1000`: błędne hasło nowej bazy lub źle zakodowane znaki w URL.
- Prisma `P1001`: sprawdź host z Connect i użyj poolera przy sieci IPv4.
- Brak tabel: uruchom `npm run db:migrate` po uzupełnieniu obu URL-i.
- Komunikat o innym projekcie: popraw login/host i `schema=games_db`; nie usuwaj kontroli zabezpieczającej.

Źródła: [Supabase — połączenia PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Google — hasła do aplikacji](https://support.google.com/accounts/answer/185833?hl=pl),
[Google — ustawienia SMTP](https://knowledge.workspace.google.com/admin/gmail/send-email-from-a-printer-scanner-or-app).
