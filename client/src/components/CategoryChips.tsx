// client/src/components/CategoryChips.tsx
// Horizontal, scrollable row of category filter chips.

import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
}

const DEFAULT_CATEGORY = "Beef";

export { DEFAULT_CATEGORY };

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 30 * 60 * 1_000, // 30 min — categories rarely change
    gcTime: 60 * 60 * 1_000, // keep in cache for 1 hour
  });

  if (isLoading) {
    return (
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        aria-label="Loading categories"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <nav aria-label="Filter by category">
      <ul
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        role="list"
      >
        {categories.map((cat) => (
          <li key={cat.idCategory} className="shrink-0">
            <Button
              variant={selected === cat.strCategory ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full gap-1.5",
                selected === cat.strCategory &&
                  "bg-orange-500 hover:bg-orange-600 border-orange-500 text-white"
              )}
              onClick={() =>
                onSelect(cat.strCategory === selected ? null : cat.strCategory)
              }
              aria-pressed={selected === cat.strCategory}
            >
              <img
                src={cat.strCategoryThumb}
                alt=""
                aria-hidden
                className="h-4 w-4 rounded-full object-cover"
              />
              {cat.strCategory}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
