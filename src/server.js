require("dotenv").config();
const express = require("express");
const cors = require("cors");
const tradesRouter = require("./routes/trades");
const authRouter = require("./auth/routes");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add a long random string to your .env before starting the server.");
  process.exit(1);
}

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, the MT5 sync script)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);
app.use(express.json({ limit: "2mb" })); // generous limit, bulk imports can have many trades

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/trades", tradesRouter);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Ledger API running on http://localhost:${PORT}`);
});
