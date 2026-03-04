// server/src/index.js
// Entry point for the Express proxy server.
// Loads env vars, registers middleware, mounts routes, and starts listening.

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mealdbRouter from "./routes/mealdb.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ---------------------------------------------------------------------------
// Security & utility middleware
// ---------------------------------------------------------------------------

// helmet sets sensible default HTTP headers
app.use(helmet());

// Allow requests from the Vite dev server and any deployed client origin.
// In production, replace the origin list with your actual domain(s).
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite default
      "http://localhost:5174", // Alternate Vite port
      process.env.CLIENT_ORIGIN ?? "",
    ].filter(Boolean),
    methods: ["GET"],
  })
);

// Gzip/Brotli compress all responses
app.use(compression());

// Parse JSON bodies (not strictly needed for a proxy, but good practice)
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// All MealDB proxy routes live under /api/*
app.use("/api", mealdbRouter);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

/** @type {import('express').ErrorRequestHandler} */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  const status = /** @type {any} */ (err).status ?? 500;
  const message = status < 500 ? err.message : "Internal server error";
  console.error("[error]", err.message);
  res.status(status).json({ error: message });
};

app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🍽️  Recipes proxy server running on http://localhost:${PORT}`);
  console.log(`   MealDB base : ${process.env.MEALDB_API_BASE}`);
  console.log(
    `   API key     : ${process.env.MEALDB_API_KEY ? "***set***" : "(default 1)"}`
  );
});
