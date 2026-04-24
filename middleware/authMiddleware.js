const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.header("Authorization");

  // ❌ No token
  if (!authHeader) {
    return res.status(401).json({ msg: "No token" });
  }

  try {
    // ✅ REMOVE "Bearer "
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ msg: "Invalid token format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded.id;

    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};