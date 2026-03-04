// api/index.js
// Vercel serverless entry point — re-exports the Express app without calling
// app.listen() so Vercel can invoke it as a serverless function.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { Router } from "express";

// ---------------------------------------------------------------------------
// In-memory cache (shared across warm invocations)
// ---------------------------------------------------------------------------

/** @type {Map<string, {data: unknown, expiresAt: number}>} */
const cache = new Map();

async function withCache(key, fetcher, ttlMs = 60_000) {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

function mealdbUrl(path) {
  const base = process.env.MEALDB_API_BASE;
  const key = process.env.MEALDB_API_KEY;
  return `${base}/${key}/${path}`;
}

async function proxyJSON(path, res, cacheKey, ttlMs) {
  const fetcher = async () => {
    const upstreamRes = await fetch(mealdbUrl(path));
    if (!upstreamRes.ok) {
      const err = new Error(
        `MealDB upstream error: ${upstreamRes.status} ${upstreamRes.statusText}`
      );
      /** @type {any} */ (err).status = upstreamRes.status;
      throw err;
    }
    return upstreamRes.json();
  };

  const data = cacheKey
    ? await withCache(cacheKey, fetcher, ttlMs)
    : await fetcher();

  res.json(data);
}

// ---------------------------------------------------------------------------
// MealDB router
// ---------------------------------------------------------------------------

const mealdbRouter = Router();

// Search meals by name  — client calls /api/search?q=
mealdbRouter.get("/search", async (req, res, next) => {
  try {
    const q = req.query.q ?? "";
    await proxyJSON(`search.php?s=${q}`, res, `search:${q}`, 60_000);
  } catch (err) {
    next(err);
  }
});

// List all meal categories — client calls /api/categories
mealdbRouter.get("/categories", async (_req, res, next) => {
  try {
    await proxyJSON("categories.php", res, "categories", 3_600_000);
  } catch (err) {
    next(err);
  }
});

// Filter meals by category — client calls /api/filter?c=
mealdbRouter.get("/filter", async (req, res, next) => {
  try {
    const c = req.query.c ?? "";
    await proxyJSON(`filter.php?c=${c}`, res, `filter:${c}`, 300_000);
  } catch (err) {
    next(err);
  }
});

// Random meal — client calls /api/random
mealdbRouter.get("/random", async (_req, res, next) => {
  try {
    await proxyJSON("random.php", res, undefined, undefined);
  } catch (err) {
    next(err);
  }
});

// Get a single meal by ID — client calls /api/meal/:id
mealdbRouter.get("/meal/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await proxyJSON(`lookup.php?i=${id}`, res, `meal:${id}`, 600_000);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim())
      : "*",
    methods: ["GET"],
  })
);
app.use(compression());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api", mealdbRouter);

/** @type {import('express').ErrorRequestHandler} */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  const status = /** @type {any} */ (err).status ?? 500;
  const message = status < 500 ? err.message : "Internal server error";
  console.error("[error]", err.message);
  res.status(status).json({ error: message });
};

app.use(errorHandler);

// Export for Vercel serverless
export default app;
