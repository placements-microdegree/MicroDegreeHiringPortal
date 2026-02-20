const DEFAULT_TTL_SECONDS = Number(process.env.API_CACHE_TTL_SECONDS || 30);

const cacheStore = new Map();

function getRoutePath(req) {
  return (
    `${req.baseUrl || ""}${req.path || ""}` || req.originalUrl.split("?")[0]
  );
}

function serializeQuery(query) {
  const entries = Object.entries(query || {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${value.join(",")}`;
      }
      return `${key}=${String(value)}`;
    })
    .join("&");
}

function buildCacheKey(req, keyPrefix = "") {
  const route = getRoutePath(req);
  const query = serializeQuery(req.query);
  const userId = req.user?.id || "anon";
  const role = req.user?.role || "anon";
  return [
    keyPrefix,
    `route=${route}`,
    `query=${query}`,
    `user=${userId}`,
    `role=${role}`,
  ]
    .filter(Boolean)
    .join("|");
}

function clearExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}

function extractRouteFromKey(cacheKey) {
  const token = cacheKey.split("|").find((part) => part.startsWith("route="));
  return token ? token.slice("route=".length) : "";
}

function invalidateByRoutePrefixes(routePrefixes = []) {
  if (!Array.isArray(routePrefixes) || routePrefixes.length === 0) return;

  for (const [cacheKey] of cacheStore.entries()) {
    const route = extractRouteFromKey(cacheKey);
    const shouldInvalidate = routePrefixes.some(
      (prefix) => route === prefix || route.startsWith(`${prefix}/`),
    );
    if (shouldInvalidate) {
      cacheStore.delete(cacheKey);
    }
  }
}

function cacheResponse({
  ttlSeconds = DEFAULT_TTL_SECONDS,
  keyPrefix = "",
} = {}) {
  const ttlMs = Math.max(1, Number(ttlSeconds || DEFAULT_TTL_SECONDS)) * 1000;

  return function cacheMiddleware(req, res, next) {
    if (req.method !== "GET") return next();

    clearExpiredEntries();

    const cacheKey = buildCacheKey(req, keyPrefix);
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.set("X-Cache", "HIT");
      return res.status(cached.status).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = function patchedJson(body) {
      if (res.statusCode < 400) {
        cacheStore.set(cacheKey, {
          body,
          status: res.statusCode || 200,
          expiresAt: Date.now() + ttlMs,
        });
      }
      res.set("X-Cache", "MISS");
      return originalJson(body);
    };

    return next();
  };
}

function invalidateApiCache(routePrefixes = []) {
  return function invalidateCacheMiddleware(req, res, next) {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        invalidateByRoutePrefixes(routePrefixes);
      }
    });
    next();
  };
}

module.exports = {
  cacheResponse,
  invalidateApiCache,
};
