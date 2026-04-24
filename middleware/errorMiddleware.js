// ✅ Global error handler
// Must have 4 params so Express recognises it as an error handler
// Controllers should call next(err) instead of res.status(500).json(...)

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message);

  // Mongoose validation error (e.g. missing required field)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      msg: messages.join(", ")
    });
  }

  // Mongoose bad ObjectId (e.g. /matches/not-an-id)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      msg: "Invalid ID format"
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      msg: "Invalid token"
    });
  }

  // Default 500
  res.status(err.statusCode || 500).json({
    success: false,
    msg: err.message || "Server Error"
  });
};

module.exports = errorHandler;