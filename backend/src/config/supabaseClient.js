const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function looksLikeServiceRoleJwt(jwt) {
  try {
    const parts = String(jwt).split(".");
    if (parts.length < 2) return false;
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
}

function getSupabaseAnonClient() {
  assertEnv("SUPABASE_URL", supabaseUrl);
  assertEnv("SUPABASE_ANON_KEY", supabaseAnonKey);

  if (looksLikeServiceRoleJwt(supabaseAnonKey)) {
    // eslint-disable-next-line no-console
    console.warn(
      "[WARN] SUPABASE_ANON_KEY appears to be a service_role key. Use the public anon key from Supabase Project Settings -> API.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseAdminClient() {
  assertEnv("SUPABASE_URL", supabaseUrl);
  assertEnv("SUPABASE_SERVICE_ROLE_KEY", supabaseServiceRoleKey);
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseForJwt(jwt) {
  assertEnv("SUPABASE_URL", supabaseUrl);
  assertEnv("SUPABASE_ANON_KEY", supabaseAnonKey);
  if (!jwt) throw new Error("Missing user JWT");
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

module.exports = {
  getSupabaseAnonClient,
  getSupabaseAdminClient,
  getSupabaseForJwt,
};
