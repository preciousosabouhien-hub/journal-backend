// former db codes

// const { Pool } = require("pg");

//const pool = new Pool({
//  connectionString: process.env.DATABASE_URL,
//});

//pool.on("error", (err) => {
 // console.error("Unexpected database error:", err);
//});

//module.exports = pool;


// new db codes
const { Pool } = require("pg");

// Render's managed Postgres (and most hosted Postgres providers) require SSL
// on external connections. Local Postgres typically doesn't have SSL set up
// at all, so we only enable it when DATABASE_URL points somewhere remote.
// `rejectUnauthorized: false` is the standard setting for Render/Heroku-style
// managed Postgres, since they use certificates not in Node's default CA list.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

module.exports = pool;