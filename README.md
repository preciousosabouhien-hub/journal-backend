# Ledger backend

Express + PostgreSQL API for the Ledger trading journal.

## 1. Install dependencies

```
npm install
```

## 2. Set up PostgreSQL

You need a Postgres server running somewhere — locally is easiest to start:

- **Windows/Mac/Linux**: install Postgres from https://www.postgresql.org/download/,
  or run it via Docker: `docker run --name ledger-db -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres`
- Create a database called `ledger` (e.g. with `createdb ledger`, or via pgAdmin / psql:
  `CREATE DATABASE ledger;`)

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your real Postgres connection string:

```
cp .env.example .env
```

Edit `.env` so `DATABASE_URL` matches your setup, e.g.:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/ledger
```

## 4. Run the migration (creates the trades table)

```
npm run migrate
```

You should see: `Migration complete. 'trades' table is ready.`

## 5. Set up login

Generate a JWT secret (used to sign sessions):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output into `.env` as `JWT_SECRET`.

Then choose a password and hash it:

```
npm run hash-password -- "your-chosen-password"
```

Copy the printed `ADMIN_PASSWORD_HASH=...` line into your `.env` file.
The plain password itself is never stored anywhere — only this hash, which
can verify a password attempt but can't be reversed back into the original.

If you ever want to change your password, just re-run `hash-password` with
the new one and replace the value in `.env`.

## 6. Start the server

```
npm start
```

Visit http://localhost:4000/health — you should see `{"status":"ok"}`.

## API reference

| Method | Path            | Auth required | Purpose                                |
|--------|-----------------|----------------|-----------------------------------------|
| GET    | /trades         | No             | List all trades                         |
| POST   | /auth/login     | No             | Log in, returns a token                 |
| POST   | /trades         | Yes            | Create one trade                        |
| POST   | /trades/import  | Yes            | Bulk import `{ "trades": [...] }`       |
| PUT    | /trades/:id     | Yes            | Update a trade (e.g. add tags)          |
| DELETE | /trades/:id     | Yes            | Delete a trade                          |

Authenticated requests need an `Authorization: Bearer <token>` header, where
`<token>` comes from a successful `POST /auth/login` response. Tokens are
valid for 7 days, after which logging in again is required.

### Example: importing journal_trades.json

Once `convert_to_journal.py` has produced `journal_trades.json`, you can push it
to this API with a short script or even curl:

```bash
curl -X POST http://localhost:4000/trades/import \
  -H "Content-Type: application/json" \
  -d "{\"trades\": $(cat journal_trades.json)}"
```

(A dedicated `push_to_api.py` script that does this automatically is the next
step once this backend is confirmed working.)

## Notes

- `external_id` (the MT5 ticket number) has a unique constraint, so re-running
  an import with overlapping trades won't create duplicates — it just skips
  ones already saved.
- Strategy tags are never set by MT5 — they always start empty and you fill
  them in via `PUT /trades/:id` from the frontend.
