// client/src/lib/utils.ts
// Shared utilities used across the app.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently (handles conflicts like p-2 vs p-4).
 * Forwarded as `cn` throughout the codebase — a shadcn/ui convention.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
