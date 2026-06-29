/**
 * hashPassword.js
 * One-time helper: turns a plain password into a bcrypt hash you paste
 * into .env as ADMIN_PASSWORD_HASH. The plain password is never stored
 * anywhere — only this hash, which can verify a password but can't be
 * reversed back into it.
 *
 * Run with:
 *   npm run hash-password -- "your-chosen-password"
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash-password -- \"your-chosen-password\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("\nAdd this line to your .env file:\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
