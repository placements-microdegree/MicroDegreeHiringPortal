function getRuntimeHost() {
  if (globalThis.window === undefined) return "";
  return globalThis.location?.hostname || "";
}

function isDeployedFrontendHost(hostname) {
  if (!hostname) return false;
  return (
    hostname.endsWith("microdegree.work") || hostname.endsWith("netlify.app")
  );
}

export function resolveApiBaseUrl() {
  const envBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
  const host = getRuntimeHost();

  // On deployed frontend domains, always use same-origin /api
  // so auth cookies remain first-party via Netlify proxy.
  if (isDeployedFrontendHost(host)) return "";

  if (envBase) return envBase;
  return "http://localhost:5000";
}
