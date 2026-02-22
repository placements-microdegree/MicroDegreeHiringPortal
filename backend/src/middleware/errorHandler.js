// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  const message = err.message || "Internal Server Error";
  const isProd = process.env.NODE_ENV === "production";

  if (!err.status && err.code === "23505") {
    status = 409;
  }
  if (!err.status && err.code === "23503") {
    status = 409;
  }

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
