"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Wraps next-themes. class strategy matches tailwind.config darkMode: ["class"].
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
