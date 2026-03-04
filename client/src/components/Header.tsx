// client/src/components/Header.tsx
// App-wide header: branding, search input, nav links, theme toggle.

import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Heart, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRef, type FormEvent } from "react";

export function Header() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) navigate(`/?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center gap-4">
        {/* Branding — navigate to / with no params to reset the home page */}
        <Link
          to="/"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="flex items-center gap-2 font-bold text-xl shrink-0"
          aria-label="Recipes — home"
        >
          <UtensilsCrossed className="h-6 w-6 text-orange-500" aria-hidden />
          <span className="hidden sm:inline">Recipes</span>
        </Link>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex flex-1 items-center gap-2"
          role="search"
          aria-label="Search recipes"
        >
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search recipes…"
              defaultValue={params.get("q") ?? ""}
              className="pl-9"
              aria-label="Search recipes"
            />
          </div>
          <Button type="submit" size="sm" className="hidden sm:flex">
            Search
          </Button>
        </form>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/favorites" aria-label="My favorites">
              <Heart className="h-5 w-5" aria-hidden />
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
