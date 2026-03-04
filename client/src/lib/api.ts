// client/src/lib/api.ts
// Typed proxy client — all calls go to /api/* served by the Express server.
// The client never touches TheMealDB directly.

export interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strYoutube: string;
  strTags: string | null;
  strSource: string | null;
  // Dynamic ingredient / measure keys (up to 20)
  [key: string]: string | null | undefined;
}

export interface MealSummary {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

export interface Category {
  idCategory: string;
  strCategory: string;
  strCategoryThumb: string;
  strCategoryDescription: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Base URL is relative so it always calls the same origin (Vite proxy in dev, same host in prod) */
const BASE = "/api";

/**
 * Thin wrapper around fetch that throws a descriptive error on non-OK responses.
 */
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Search meals by name */
export async function searchMeals(query: string): Promise<Meal[]> {
  const data = await apiFetch<{ meals: Meal[] | null }>(
    `/search?q=${encodeURIComponent(query)}`
  );
  return data.meals ?? [];
}

/** Fetch a single meal by ID */
export async function getMeal(id: string): Promise<Meal | null> {
  const data = await apiFetch<{ meals: Meal[] | null }>(`/meal/${id}`);
  return data.meals?.[0] ?? null;
}

/** Fetch all top-level categories */
export async function getCategories(): Promise<Category[]> {
  const data = await apiFetch<{ categories: Category[] }>("/categories");
  return data.categories ?? [];
}

/** Fetch meal summaries for a category */
export async function getMealsByCategory(
  category: string
): Promise<MealSummary[]> {
  const data = await apiFetch<{ meals: MealSummary[] | null }>(
    `/filter?c=${encodeURIComponent(category)}`
  );
  return data.meals ?? [];
}

/**
 * Fetch meal summaries for every category in parallel and return a
 * deduplicated flat list, alphabetically sorted.
 * MealDB has no "get all" endpoint, so we fan out across categories.
 */
export async function getAllMeals(): Promise<MealSummary[]> {
  const categories = await getCategories();
  const results = await Promise.allSettled(
    categories.map((c) => getMealsByCategory(c.strCategory))
  );
  const seen = new Set<string>();
  const meals: MealSummary[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const m of r.value) {
        if (!seen.has(m.idMeal)) {
          seen.add(m.idMeal);
          meals.push(m);
        }
      }
    }
  }
  return meals.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
}

/** Fetch a random meal */
export async function getRandomMeal(): Promise<Meal | null> {
  const data = await apiFetch<{ meals: Meal[] | null }>("/random");
  return data.meals?.[0] ?? null;
}

// ── Ingredient extraction ────────────────────────────────────────────────────

export interface Ingredient {
  name: string;
  measure: string;
}

/**
 * Extract the up-to-20 ingredient/measure pairs from a Meal object.
 * TheMealDB stores them as strIngredient1…strIngredient20 / strMeasure1…strMeasure20.
 */
export function extractIngredients(meal: Meal): Ingredient[] {
  const ingredients: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim() ?? "";
    if (name) {
      ingredients.push({ name, measure });
    }
  }
  return ingredients;
}
