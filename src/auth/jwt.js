const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
const EXPIRY = "7d"; // stay logged in for a week before needing to log in again

function signToken() {
  // No user data needed in the payload — there's only one account.
  return jwt.sign({ role: "admin" }, SECRET, { expiresIn: EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET); // throws if invalid/expired
}

module.exports = { signToken, verifyToken };
