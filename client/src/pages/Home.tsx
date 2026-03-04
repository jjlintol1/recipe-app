// client/src/pages/Home.tsx
// Landing page: search bar, category chips, and results grid.
// URL state: /?q=chicken or /?category=Seafood

import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { searchMeals, getMealsByCategory } from "@/lib/api";
import { CategoryChips, DEFAULT_CATEGORY } from "@/components/CategoryChips";
import { RecipeCard } from "@/components/RecipeCard";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle } from "lucide-react";
import type { Meal, MealSummary } from "@/lib/api";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  // Fall back to DEFAULT_CATEGORY when no category param is present so the
  // home screen always shows recipes immediately.
  const selectedCategory =
    searchParams.get("category") ?? (query ? null : DEFAULT_CATEGORY);

  // ── Search query ──────────────────────────────────────────────────────────
  const {
    data: searchResults,
    isLoading: searchLoading,
    isError: searchError,
    error: searchErrObj,
  } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchMeals(query),
    enabled: !!query,
    staleTime: 2 * 60 * 1_000,
  });

  // ── Category filter ───────────────────────────────────────────────────────
  const {
    data: categoryResults,
    isLoading: catLoading,
    isError: catError,
    error: catErrObj,
  } = useQuery({
    queryKey: ["filter", selectedCategory],
    queryFn: () => getMealsByCategory(selectedCategory!),
    enabled: !!selectedCategory && !query,
    staleTime: 5 * 60 * 1_000,
  });

  // ── Derived display state ─────────────────────────────────────────────────
  const isLoading = query ? searchLoading : catLoading;
  const isError = query ? searchError : catError;
  const error = query ? searchErrObj : catErrObj;

  const meals: (Meal | MealSummary)[] = query
    ? (searchResults ?? [])
    : (categoryResults ?? []);

  // ── Cache thumbnails via SW whenever a new batch of meals loads ───────────
  useEffect(() => {
    if (!meals.length) return;
    const urls = meals.map((m) => m.strMealThumb).filter(Boolean);
    // navigator.serviceWorker.controller is null until the SW has claimed the
    // page. Use .ready to wait for it rather than silently dropping the message.
    navigator.serviceWorker?.ready.then((reg) => {
      reg.active?.postMessage({ type: "CACHE_URLS", urls });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, categoryResults]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleCategorySelect(cat: string | null) {
    const next = new URLSearchParams();
    // Selecting a category clears any active search query and vice-versa.
    // Selecting "All" (null) clears everything → welcome screen.
    if (cat) next.set("category", cat);
    setSearchParams(next, { replace: true });
  }

  return (
    <main id="main-content" className="container py-8 space-y-6">
      <h1 className="sr-only">Browse Recipes</h1>

      {/* Category chips */}
      <CategoryChips
        selected={selectedCategory}
        onSelect={handleCategorySelect}
      />

      {/* Results area */}
      {isLoading && <SkeletonGrid count={8} />}

      {isError && (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-destructive" />}
          title="Something went wrong"
          description={
            (error as Error)?.message ??
            "Could not load recipes. Check your connection."
          }
        />
      )}

      {!isLoading && !isError && meals.length === 0 && (
        <EmptyState
          icon="🍽️"
          title={
            query ? `No results for "${query}"` : "No recipes in this category"
          }
          description="Try a different search term or browse another category."
        />
      )}

      {!isLoading && !isError && meals.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {query
              ? `${meals.length} result${meals.length !== 1 ? "s" : ""} for "${query}"`
              : selectedCategory
                ? `${meals.length} recipe${meals.length !== 1 ? "s" : ""} in ${selectedCategory}`
                : `${meals.length} recipes`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {meals.map((meal) => (
              <RecipeCard key={meal.idMeal} meal={meal} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
