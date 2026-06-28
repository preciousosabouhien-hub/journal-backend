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

## 5. Start the server

```
npm start
```

Visit http://localhost:4000/health — you should see `{"status":"ok"}`.

## API reference

| Method | Path            | Purpose                                      |
|--------|-----------------|-----------------------------------------------|
| GET    | /trades         | List all trades                               |
| POST   | /trades         | Create one trade                              |
| POST   | /trades/import  | Bulk import `{ "trades": [...] }`             |
| PUT    | /trades/:id     | Update a trade (e.g. add tags)                |
| DELETE | /trades/:id     | Delete a trade                                |

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
