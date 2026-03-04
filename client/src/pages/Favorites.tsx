// client/src/pages/Favorites.tsx
// Offline-capable favorites page.
// All data is read from IndexedDB — works without a network connection.

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2, Search, SortAsc, SortDesc } from "lucide-react";
import {
  useFavorites,
  useToggleFavorite,
} from "@/features/favorites/useFavorites";
import { RecipeCard } from "@/components/RecipeCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { Meal } from "@/lib/api";

type SortOrder = "az" | "za";

export default function Favorites() {
  const { data: favorites = [], isLoading } = useFavorites();
  const { toggle } = useToggleFavorite();

  const [filterText, setFilterText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");

  // ── Filtered + sorted list ─────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...favorites];

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(
        (m) =>
          m.strMeal.toLowerCase().includes(q) ||
          m.strCategory.toLowerCase().includes(q) ||
          m.strArea.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) =>
      sortOrder === "az"
        ? a.strMeal.localeCompare(b.strMeal)
        : b.strMeal.localeCompare(a.strMeal)
    );

    return list;
  }, [favorites, filterText, sortOrder]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main id="main-content" className="container py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="container py-8 space-y-6">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <Heart className="h-7 w-7 text-red-500 fill-red-500" aria-hidden />
        <h1 className="text-2xl font-bold">My Favorites</h1>
        {favorites.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {favorites.length}
          </Badge>
        )}
      </div>

      {/* Empty state */}
      {favorites.length === 0 && (
        <EmptyState
          icon="🤍"
          title="No favorites yet"
          description="Tap the heart on any recipe to save it for offline viewing."
          action={
            <Button asChild>
              <Link to="/">Browse Recipes</Link>
            </Button>
          }
        />
      )}

      {/* Controls (only shown when there are favorites) */}
      {favorites.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Filter favorites…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9"
                aria-label="Filter saved recipes"
              />
            </div>

            {/* Sort toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((o) => (o === "az" ? "za" : "az"))}
              aria-label={sortOrder === "az" ? "Sort Z → A" : "Sort A → Z"}
              className="gap-2"
            >
              {sortOrder === "az" ? (
                <SortAsc className="h-4 w-4" aria-hidden />
              ) : (
                <SortDesc className="h-4 w-4" aria-hidden />
              )}
              {sortOrder === "az" ? "A → Z" : "Z → A"}
            </Button>
          </div>

          {/* "No filter matches" state */}
          {displayed.length === 0 && filterText && (
            <EmptyState
              icon="🔍"
              title={`No matches for "${filterText}"`}
              description="Try a different search term."
            />
          )}

          {/* Grid */}
          {displayed.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayed.map((meal: Meal) => (
                <div key={meal.idMeal} className="relative group/fav">
                  <RecipeCard meal={meal} isFull />
                  {/* Quick-remove button overlaid in the card corner */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover/fav:opacity-100 focus-visible:opacity-100 transition-opacity"
                    onClick={() => toggle(meal, true)}
                    aria-label={`Remove "${meal.strMeal}" from favorites`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
