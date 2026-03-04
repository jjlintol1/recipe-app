// server/src/routes/mealdb.js
// All TheMealDB proxy routes. The API key lives only on the server;
// clients call /api/* and never touch TheMealDB directly.

import { Router } from "express";

/** @type {Map<string, {data: unknown, expiresAt: number}>} */
const cache = new Map();

/**
 * Simple in-memory TTL cache.
 * @param {string} key
 * @param {() => Promise<unknown>} fetcher
 * @param {number} [ttlMs=60_000]
 */
async function withCache(key, fetcher, ttlMs = 60_000) {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

/**
 * Build a MealDB URL from the configured base and key.
 * @param {string} path  e.g. "search.php?s=chicken"
 * @returns {string}
 */
function mealdbUrl(path) {
  const base = process.env.MEALDB_API_BASE;
  const key = process.env.MEALDB_API_KEY;
  return `${base}/${key}/${path}`;
}

/**
 * Fetch JSON from TheMealDB and forward it to the client.
 * Throws on non-OK responses so the global error handler can catch them.
 * @param {string} path
 * @param {import('express').Response} res
 * @param {string} [cacheKey]
 * @param {number} [ttlMs]
 */
async function proxyJSON(path, res, cacheKey, ttlMs) {
  const fetcher = async () => {
    const upstreamRes = await fetch(mealdbUrl(path));
    if (!upstreamRes.ok) {
      const err = new Error(
        `MealDB upstream error: ${upstreamRes.status} ${upstreamRes.statusText}`
      );
      /** @type {any} */ (err).status = 502;
      throw err;
    }
    return upstreamRes.json();
  };

  const data = cacheKey
    ? await withCache(cacheKey, fetcher, ttlMs)
    : await fetcher();

  // Tell browsers (and the SW) they may cache the response briefly
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(data);
}

const router = Router();

// GET /api/search?q=chicken
router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "");
    if (!q.trim()) {
      return res.status(400).json({ error: 'Query param "q" is required' });
    }
    const upstreamRes = await fetch(
      mealdbUrl(`search.php?s=${encodeURIComponent(q)}`)
    );
    if (!upstreamRes.ok) {
      return res.json({ meals: [] });
    }
    const data = await upstreamRes.json();
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/meal/:id
router.get("/meal/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid meal ID" });
    }
    // Cache individual meals for 5 minutes — they rarely change
    await proxyJSON(`lookup.php?i=${id}`, res, `meal:${id}`, 5 * 60_000);
  } catch (err) {
    next(err);
  }
});

// GET /api/categories
router.get("/categories", async (req, res, next) => {
  try {
    // Categories are very stable — cache for 10 minutes
    await proxyJSON("categories.php", res, "categories", 10 * 60_000);
  } catch (err) {
    next(err);
  }
});

// GET /api/filter?c=Seafood
router.get("/filter", async (req, res, next) => {
  try {
    const c = String(req.query.c ?? "");
    if (!c.trim()) {
      return res
        .status(400)
        .json({ error: 'Query param "c" (category) is required' });
    }
    // Cache filter results for 5 minutes.
    // If MealDB returns a non-OK response for this category (some categories
    // intermittently fail on the free API), return an empty list rather than
    // propagating a 502 — the UI will show "No recipes in this category".
    const cacheKey = `filter:${c}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      res.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300"
      );
      return res.json(cached.data);
    }
    const upstreamRes = await fetch(
      mealdbUrl(`filter.php?c=${encodeURIComponent(c)}`)
    );
    if (!upstreamRes.ok) {
      // Soft-fail: return empty meals array so the client degrades gracefully
      return res.json({ meals: [] });
    }
    const data = await upstreamRes.json();
    cache.set(cacheKey, { data, expiresAt: Date.now() + 5 * 60_000 });
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/random
router.get("/random", async (req, res, next) => {
  try {
    // Random meals must never be cached
    await proxyJSON("random.php", res);
  } catch (err) {
    next(err);
  }
});

export default router;
