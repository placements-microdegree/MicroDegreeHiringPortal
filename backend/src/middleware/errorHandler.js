// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    // Helpful in dev
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const payload = { success: false, message };

  // Supabase/PostgREST errors often include these fields.
  if (!isProd) {
    payload.code = err.code;
    payload.details = err.details;
    payload.hint = err.hint;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
