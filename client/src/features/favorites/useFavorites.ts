// client/src/features/favorites/useFavorites.ts
// React hooks for reading and mutating the IndexedDB favorites store.
// Using TanStack Query so the rest of the UI can subscribe reactively.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllFavorites,
  saveFavorite,
  removeFavorite,
  isFavorite,
} from "./db";
import type { Meal } from "@/lib/api";

export const FAVORITES_KEY = ["favorites"] as const;

// ── SW messaging helpers ──────────────────────────────────────────────────────

/** Tell the service worker to durably cache a favorite's image + API detail. */
function swCacheFavorite(meal: Meal) {
  navigator.serviceWorker?.ready.then((reg) => {
    reg.active?.postMessage({
      type: "CACHE_FAVORITE",
      imageUrl: meal.strMealThumb,
      apiUrl: `/api/meal/${meal.idMeal}`,
    });
  });
}

/** Tell the service worker to evict a favorite's image from the durable cache. */
function swEvictFavorite(meal: Meal) {
  navigator.serviceWorker?.ready.then((reg) => {
    reg.active?.postMessage({
      type: "EVICT_FAVORITE",
      imageUrl: meal.strMealThumb,
      apiUrl: `/api/meal/${meal.idMeal}`,
    });
  });
}

// ── Read ─────────────────────────────────────────────────────────────────────

/** Subscribe to the full list of favorites. */
export function useFavorites() {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getAllFavorites,
    // Keep favorites fresh — they're local, no stale concerns
    staleTime: 0,
  });
}

/** Check whether a specific meal is favorited. */
export function useIsFavorite(idMeal: string) {
  return useQuery({
    queryKey: [...FAVORITES_KEY, idMeal],
    queryFn: () => isFavorite(idMeal),
    staleTime: 0,
  });
}

// ── Write ────────────────────────────────────────────────────────────────────

/** Toggle a meal in/out of favorites with optimistic UI. */
export function useToggleFavorite() {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: saveFavorite,
    onSuccess: (_, meal) => {
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
      swCacheFavorite(meal); // durably cache image + API detail in SW
      toast.success(`"${meal.strMeal}" added to favorites 🤍`);
    },
    onError: () => toast.error("Could not save favorite"),
  });

  const remove = useMutation({
    mutationFn: (meal: Meal) => removeFavorite(meal.idMeal),
    onSuccess: (_, meal) => {
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
      swEvictFavorite(meal); // remove from durable favorites cache in SW
      toast.success(`"${meal.strMeal}" removed from favorites`);
    },
    onError: () => toast.error("Could not remove favorite"),
  });

  /**
   * Toggle the favorite state of a meal.
   * Pass the full Meal object (we store the whole thing for offline access).
   */
  async function toggle(meal: Meal, currentlyFavorited: boolean) {
    if (currentlyFavorited) {
      remove.mutate(meal);
    } else {
      add.mutate(meal);
    }
  }

  return {
    toggle,
    isPending: add.isPending || remove.isPending,
  };
}
