/**
 * migrate.js
 * Creates the trades table if it doesn't already exist.
 * Run with: npm run migrate
 */

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  external_id TEXT,              -- original id/ticket from MT5, kept to avoid duplicate imports
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  open_time DATE NOT NULL,
  open_price NUMERIC,
  close_price NUMERIC,
  sl NUMERIC,
  tp NUMERIC,
  lot NUMERIC,
  pl NUMERIC NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prevents the same MT5 trade from being imported twice if you re-run the sync.
CREATE UNIQUE INDEX IF NOT EXISTS trades_external_id_unique
  ON trades (external_id)
  WHERE external_id IS NOT NULL;
`;

async function main() {
  console.log("Connecting to database...");
  await pool.query(CREATE_TABLE_SQL);
  console.log("Migration complete. 'trades' table is ready.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
