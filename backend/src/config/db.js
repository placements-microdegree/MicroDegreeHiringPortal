const {
  getSupabaseAdminClient,
  getSupabaseAnonClient,
  getSupabaseForJwt,
} = require("./supabaseClient");

const isServiceRoleConfigured = Boolean(
  (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
);

let cachedAnon = null;
let cachedAdmin = null;

function getSupabaseAnon() {
  if (!cachedAnon) cachedAnon = getSupabaseAnonClient();
  return cachedAnon;
}

function getSupabaseAdmin() {
  if (!isServiceRoleConfigured) return null;
  if (!cachedAdmin) cachedAdmin = getSupabaseAdminClient();
  return cachedAdmin;
}

function getSupabaseUser(jwt) {
  return getSupabaseForJwt(jwt);
}

module.exports = {
  isServiceRoleConfigured,
  getSupabaseAnon,
  getSupabaseAdmin,
  getSupabaseUser,
};
