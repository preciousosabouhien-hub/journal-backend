const express = require("express");
const bcrypt = require("bcryptjs");
const { signToken } = require("./jwt");

const router = express.Router();

// Very deliberately simple: there's exactly one account, defined entirely
// by environment variables. No users table, no signup — this app has one
// owner and that's by design.
router.post("/login", async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    console.error("ADMIN_PASSWORD_HASH is not set in the environment");
    return res.status(500).json({ error: "Server is not configured for login yet" });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    // Same message whether the password is wrong or missing entirely —
    // don't give an attacker any hint about which.
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = signToken();
  res.json({ token });
});

module.exports = router;
