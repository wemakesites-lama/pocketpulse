// Minimal cn() helper. shadcn's init will overwrite this with its cva-aware version
// once components are added (build step 1 / design system).
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
