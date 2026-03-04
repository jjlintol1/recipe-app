// client/src/components/ThemeToggle.tsx
// Single icon button that toggles between light and dark theme.
// Shows the Sun icon in dark mode (click → go light) and Moon in light mode (click → go dark).
// "System" preference is resolved on first load by ThemeProvider; after the first
// manual toggle the user's explicit choice is persisted in localStorage.

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Resolve the effective theme so "system" maps to the OS preference.
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Moon className="h-5 w-5" aria-hidden />
      ) : (
        <Sun className="h-5 w-5" aria-hidden />
      )}
    </Button>
  );
}
