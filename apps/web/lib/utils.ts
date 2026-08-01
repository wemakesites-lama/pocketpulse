import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() — merge conditional class lists and resolve Tailwind conflicts (last wins).
// Used by every shadcn/ui primitive in components/ui.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
