const { verifyToken } = require("./jwt");

/**
 * Protects a route — requires a valid "Authorization: Bearer <token>" header.
 * Use on any route that modifies data (create/update/delete/import).
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please log in again" });
  }
}

module.exports = requireAuth;
