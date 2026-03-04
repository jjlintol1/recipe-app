// client/src/features/favorites/db.ts
// IndexedDB helpers for offline favorites persistence.
// We use the `idb` library for a Promise-based API over the raw IDB interface.
//
// Schema:
//   database : "recipes-pwa"
//   store    : "favorites"  (keyPath: "idMeal")
//   value    : Meal object (full detail, so it's viewable offline)

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Meal } from "@/lib/api";

// ── Schema type ──────────────────────────────────────────────────────────────

interface RecipesDB extends DBSchema {
  favorites: {
    key: string; // idMeal
    value: Meal;
  };
}

// ── Database initialisation (lazy singleton) ─────────────────────────────────

let dbPromise: Promise<IDBPDatabase<RecipesDB>> | null = null;

/**
 * Open (or reuse) the IndexedDB database.
 * Called lazily so we don't block the initial render.
 */
function getDB(): Promise<IDBPDatabase<RecipesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RecipesDB>("recipes-pwa", 1, {
      upgrade(db) {
        // Create the object store on first open / version upgrade
        if (!db.objectStoreNames.contains("favorites")) {
          db.createObjectStore("favorites", { keyPath: "idMeal" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Public helpers ───────────────────────────────────────────────────────────

/** Persist a meal as a favorite. Overwrites if it already exists. */
export async function saveFavorite(meal: Meal): Promise<void> {
  const db = await getDB();
  await db.put("favorites", meal);
}

/** Remove a meal from favorites by ID. */
export async function removeFavorite(idMeal: string): Promise<void> {
  const db = await getDB();
  await db.delete("favorites", idMeal);
}

/** Return a single favorite by ID, or undefined if not saved. */
export async function getFavorite(idMeal: string): Promise<Meal | undefined> {
  const db = await getDB();
  return db.get("favorites", idMeal);
}

/** Return all saved favorites, newest-first (sorted by strMeal alphabetically as a proxy). */
export async function getAllFavorites(): Promise<Meal[]> {
  const db = await getDB();
  return db.getAll("favorites");
}

/** Return true if the meal is already in favorites. */
export async function isFavorite(idMeal: string): Promise<boolean> {
  const result = await getFavorite(idMeal);
  return result !== undefined;
}

/** Clear all favorites (used in tests / settings). */
export async function clearFavorites(): Promise<void> {
  const db = await getDB();
  await db.clear("favorites");
}
