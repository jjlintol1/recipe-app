// client/src/pages/Details.tsx
// Full recipe detail page: image, metadata, ingredients, instructions, YouTube link.

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMeal, extractIngredients } from "@/lib/api";
import {
  useIsFavorite,
  useToggleFavorite,
} from "@/features/favorites/useFavorites";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Heart,
  ArrowLeft,
  ExternalLink,
  Youtube,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Details() {
  const { id = "" } = useParams<{ id: string }>();

  const {
    data: meal,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["meal", id],
    queryFn: () => getMeal(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1_000,
    retry: (count, err) => {
      // Don't retry 4xx errors
      if ((err as { status?: number }).status === 404) return false;
      return count < 2;
    },
  });

  const { data: favorited = false } = useIsFavorite(id);
  const { toggle, isPending } = useToggleFavorite();

  const ingredients = meal ? extractIngredients(meal) : [];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main id="main-content" className="container py-8 max-w-4xl">
        <Skeleton className="h-6 w-24 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </main>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <main id="main-content" className="container py-8">
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-destructive" />}
          title="Could not load recipe"
          description={
            (error as Error)?.message ??
            "Please check your connection and try again."
          }
          action={
            <Button asChild variant="outline">
              <Link to="/">← Back to recipes</Link>
            </Button>
          }
        />
      </main>
    );
  }

  if (!meal) {
    return (
      <main id="main-content" className="container py-8">
        <EmptyState
          icon="🔍"
          title="Recipe not found"
          description="This meal doesn't exist or has been removed."
          action={
            <Button asChild variant="outline">
              <Link to="/">← Back to recipes</Link>
            </Button>
          }
        />
      </main>
    );
  }

  // ── Full detail view ──────────────────────────────────────────────────────
  return (
    <main id="main-content" className="container py-8 max-w-4xl space-y-8">
      {/* Back link */}
      <nav aria-label="Breadcrumb">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/" aria-label="Back to all recipes">
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden />
            All Recipes
          </Link>
        </Button>
      </nav>

      <article aria-label={meal.strMeal}>
        {/* Hero grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="relative rounded-xl overflow-hidden aspect-square bg-muted">
            <img
              src={meal.strMealThumb}
              alt={`Photo of ${meal.strMeal}`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Metadata + Ingredients */}
          <div className="space-y-5">
            {/* Title + favorite */}
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-bold leading-tight flex-1">
                {meal.strMeal}
              </h1>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 mt-0.5"
                onClick={() => toggle(meal, favorited)}
                disabled={isPending}
                aria-pressed={favorited}
                aria-label={
                  favorited ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart
                  className={cn(
                    "h-5 w-5 transition-colors",
                    favorited ? "fill-red-500 text-red-500" : ""
                  )}
                  aria-hidden
                />
              </Button>
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2">
              {meal.strCategory && (
                <Badge variant="secondary">{meal.strCategory}</Badge>
              )}
              {meal.strArea && <Badge variant="outline">{meal.strArea}</Badge>}
              {meal.strTags
                ?.split(",")
                .filter(Boolean)
                .map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
            </div>

            <Separator />

            {/* Ingredients */}
            <section aria-labelledby="ingredients-heading">
              <h2
                id="ingredients-heading"
                className="font-semibold text-lg mb-3"
              >
                Ingredients
              </h2>
              <ul
                className="space-y-1.5"
                role="list"
                aria-label="Ingredient list"
              >
                {ingredients.map(({ name, measure }) => (
                  <li key={name} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0"
                      aria-hidden
                    />
                    <span className="font-medium">{name}</span>
                    {measure && (
                      <span className="text-muted-foreground ml-auto">
                        {measure}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* External links */}
            <div className="flex flex-wrap gap-3 pt-2">
              {meal.strYoutube && (
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <a
                    href={meal.strYoutube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch ${meal.strMeal} video on YouTube (opens in new tab)`}
                  >
                    <Youtube className="h-4 w-4 text-red-500" aria-hidden />
                    Watch on YouTube
                    <ExternalLink
                      className="h-3 w-3 ml-1 opacity-50"
                      aria-hidden
                    />
                  </a>
                </Button>
              )}
              {meal.strSource && (
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={meal.strSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View original recipe source (opens in new tab)"
                  >
                    Source
                    <ExternalLink
                      className="h-3 w-3 ml-1 opacity-50"
                      aria-hidden
                    />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Instructions */}
        <section aria-labelledby="instructions-heading">
          <h2 id="instructions-heading" className="text-xl font-semibold mb-4">
            Instructions
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {meal.strInstructions
              .split(/\r?\n/)
              .filter((line) => line.trim())
              .map((para, i) => (
                <p
                  key={i}
                  className="mb-3 text-sm leading-relaxed text-foreground/90"
                >
                  {para.trim()}
                </p>
              ))}
          </div>
        </section>
      </article>
    </main>
  );
}
