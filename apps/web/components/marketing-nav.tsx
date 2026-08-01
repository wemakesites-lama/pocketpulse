"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LINKS = [{ href: "/features", label: "Features" }];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      {/* Desktop */}
      <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
        {LINKS.map((l) => (
          <Button key={l.href} asChild variant="ghost" size="sm">
            <Link href={l.href}>{l.label}</Link>
          </Button>
        ))}
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Login</Link>
        </Button>
        <ModeToggle />
        <Button asChild className="ml-1 rounded-full">
          <Link href="/login">Try it with sample receipts</Link>
        </Button>
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-1 sm:hidden">
        <ModeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader className="text-left">
              <SheetTitle>PocketPulse</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid gap-1">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Login
              </Link>
              <Button asChild className="mt-2 w-full rounded-full">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Try it with sample receipts
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
