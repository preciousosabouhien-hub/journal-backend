const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// Map a Postgres row -> the shape the frontend expects (camelCase, matches the artifact's trade objects)
function rowToTrade(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    openTime: row.open_time.toISOString().slice(0, 10),
    openPrice: row.open_price !== null ? Number(row.open_price) : null,
    closePrice: row.close_price !== null ? Number(row.close_price) : null,
    sl: row.sl !== null ? Number(row.sl) : null,
    tp: row.tp !== null ? Number(row.tp) : null,
    lot: row.lot !== null ? Number(row.lot) : null,
    pl: Number(row.pl),
    tags: row.tags || [],
    notes: row.notes || "",
  };
}

// GET /trades — fetch everything, oldest first (frontend sorts/derives stats itself)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM trades ORDER BY open_time ASC, id ASC");
    res.json(result.rows.map(rowToTrade));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

// POST /trades — add a single trade (manual entry from the "Log trade" form)
router.post("/", async (req, res) => {
  const { symbol, direction, openTime, openPrice, closePrice, sl, tp, lot, pl, tags, notes, externalId } = req.body;

  if (!symbol || !direction || !openTime) {
    return res.status(400).json({ error: "symbol, direction, and openTime are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO trades
        (external_id, symbol, direction, open_time, open_price, close_price, sl, tp, lot, pl, tags, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
       RETURNING *`,
      [
        externalId ?? null,
        symbol,
        direction,
        openTime,
        openPrice ?? null,
        closePrice ?? null,
        sl ?? null,
        tp ?? null,
        lot ?? null,
        pl ?? 0,
        tags ?? [],
        notes ?? "",
      ]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: "Trade with this external_id already exists" });
    }

    res.status(201).json(rowToTrade(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create trade" });
  }
});

// POST /trades/import — bulk import, used for journal_trades.json from the MT5 sync pipeline
router.post("/import", async (req, res) => {
  const trades = req.body.trades;
  if (!Array.isArray(trades) || trades.length === 0) {
    return res.status(400).json({ error: "Body must include a non-empty 'trades' array" });
  }

  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    await client.query("BEGIN");

    for (const t of trades) {
      const externalId = t.id ?? t.ticket ?? null;
      const result = await client.query(
        `INSERT INTO trades
          (external_id, symbol, direction, open_time, open_price, close_price, sl, tp, lot, pl, tags, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
         RETURNING id`,
        [
          externalId !== null ? String(externalId) : null,
          t.symbol || "UNKNOWN",
          t.direction === "sell" ? "sell" : "buy",
          t.openTime || t.time || new Date().toISOString().slice(0, 10),
          t.openPrice ?? t.open_price ?? null,
          t.closePrice ?? t.close_price ?? t.price ?? null,
          t.sl ?? null,
          t.tp ?? null,
          t.lot ?? t.volume ?? null,
          t.pl ?? t.profit ?? 0,
          Array.isArray(t.tags) ? t.tags : [],
          t.notes || t.comment || "",
        ]
      );
      if (result.rows.length > 0) inserted += 1;
      else skipped += 1;
    }

    await client.query("COMMIT");
    res.status(201).json({ inserted, skipped, total: trades.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Bulk import failed, no trades were saved" });
  } finally {
    client.release();
  }
});

// PUT /trades/:id — edit a trade (commonly used to add strategy tags after import)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { symbol, direction, openTime, openPrice, closePrice, sl, tp, lot, pl, tags, notes } = req.body;

  try {
    const result = await pool.query(
      `UPDATE trades SET
        symbol = COALESCE($1, symbol),
        direction = COALESCE($2, direction),
        open_time = COALESCE($3, open_time),
        open_price = COALESCE($4, open_price),
        close_price = COALESCE($5, close_price),
        sl = COALESCE($6, sl),
        tp = COALESCE($7, tp),
        lot = COALESCE($8, lot),
        pl = COALESCE($9, pl),
        tags = COALESCE($10, tags),
        notes = COALESCE($11, notes)
       WHERE id = $12
       RETURNING *`,
      [symbol, direction, openTime, openPrice, closePrice, sl, tp, lot, pl, tags, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }
    res.json(rowToTrade(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update trade" });
  }
});

// DELETE /trades/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM trades WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

module.exports = router;
