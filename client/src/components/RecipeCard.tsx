// client/src/components/RecipeCard.tsx
// Card displaying a meal summary in the grid views (Home & Favorites).
// Shows image, title, category/area badges, and a favorite toggle button.

import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useIsFavorite,
  useToggleFavorite,
} from "@/features/favorites/useFavorites";
import { getMeal } from "@/lib/api";
import type { Meal, MealSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  /** Full Meal or a slim MealSummary */
  meal: Meal | MealSummary;
  /** When true the card is being rendered from the Favorites page (meal is always full) */
  isFull?: boolean;
}

function isMeal(m: Meal | MealSummary): m is Meal {
  // A full Meal always has a non-empty strCategory; MealSummary never does
  return "strCategory" in m && !!(m as Meal).strCategory;
}

/**
 * Lazily fetches the full meal detail for a MealSummary card so we can
 * display the area (nationality) badge. Results are cached for 30 min.
 * The query is disabled when the full Meal object is already available.
 */
function useLazyArea(
  meal: Meal | MealSummary,
  isFull: boolean
): string | undefined {
  const skip = isFull || isMeal(meal);
  const { data } = useQuery({
    queryKey: ["meal", meal.idMeal],
    queryFn: () => getMeal(meal.idMeal),
    enabled: !skip,
    staleTime: 30 * 60 * 1_000,
    gcTime: 60 * 60 * 1_000,
  });
  return data?.strArea ?? undefined;
}

export function RecipeCard({ meal, isFull = false }: RecipeCardProps) {
  const full = isMeal(meal);
  const lazyArea = useLazyArea(meal, isFull);

  const { data: favorited = false } = useIsFavorite(meal.idMeal);
  const { toggle, isPending } = useToggleFavorite();

  // For summaries we need to fetch the full Meal before we can persist it to
  // IndexedDB (favorites need full data for offline viewing).
  async function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation(); // prevent the wrapping Link from navigating
    if (full || isFull) {
      toggle(meal as Meal, favorited);
    } else {
      // Fetch full detail on-demand so we can store the complete meal object
      const fullMeal = await getMeal(meal.idMeal);
      if (fullMeal) toggle(fullMeal, favorited);
    }
  }

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring h-full">
      {/* The whole card is a link; the favorite button stops propagation */}
      <Link
        to={`/meal/${meal.idMeal}`}
        aria-label={`View recipe: ${meal.strMeal}`}
        className="flex flex-col h-full focus:outline-none"
      >
        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={meal.strMealThumb}
            alt={meal.strMeal}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <CardContent className="p-4 flex flex-col flex-1">
          {/* Title — always occupies exactly 2 lines so the bottom row stays aligned.
              Both minHeight and maxHeight are set so it never bleeds a third line. */}
          <p
            className="font-semibold text-sm leading-snug mb-3 group-hover:underline"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              // leading-snug on text-sm = 0.875rem × 1.375 = ~1.203rem per line.
              // Set both min and max to exactly 2 lines using the computed value.
              minHeight: "2.406rem",
              maxHeight: "2.406rem",
            }}
          >
            {meal.strMeal}
          </p>

          {/* Bottom row: area badge left, favorite button right */}
          <div className="flex items-center justify-between gap-2 mt-auto">
            {/* Area/nationality badge — the most informative single piece of context.
                Uses lazyArea for MealSummary cards (fetched on demand, cached 30min). */}
            <div className="min-w-0">
              {(full ? (meal as Meal).strArea : lazyArea) && (
                <Badge variant="outline" className="text-xs">
                  {full ? (meal as Meal).strArea : lazyArea}
                </Badge>
              )}
            </div>

            {/* Favorite button — shrink-0 so it always stays full size */}
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-8 w-8 -mr-1 -mb-1"
              onClick={handleFavoriteClick}
              disabled={isPending}
              aria-pressed={favorited}
              aria-label={
                favorited
                  ? `Remove "${meal.strMeal}" from favorites`
                  : `Add "${meal.strMeal}" to favorites`
              }
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  favorited
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground"
                )}
                aria-hidden
              />
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
