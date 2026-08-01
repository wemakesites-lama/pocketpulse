"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Plus,
  ClipboardCheck,
  FileCheck2,
  Repeat,
  CheckCircle2,
  MoreHorizontal,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { webStorage, DEMO_KEY } from "@/lib/storage.web";
import { LedgerProvider } from "@/components/ledger-provider";
import { getSupabase, supabaseEnabled } from "@/lib/supabase.client";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// PART 11 app shell. Auth guard: a Supabase session when configured, else the
// localStorage demo gate. Client-side (not a security boundary).
type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/app", label: "Overview", icon: Home },
  { href: "/app/add", label: "Add receipts", icon: Plus },
  { href: "/app/review", label: "Review", icon: ClipboardCheck },
  { href: "/app/paperwork", label: "Paperwork", icon: FileCheck2 },
  { href: "/app/repeating", label: "Repeating", icon: Repeat },
  { href: "/app/approved", label: "Approved", icon: CheckCircle2 },
];

// Mobile bottom bar shows the four workflow steps; the rest live behind "More".
const PRIMARY = NAV.slice(0, 4);
const OVERFLOW = NAV.slice(4);

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const supabase = getSupabase();

  useEffect(() => {
    if (supabaseEnabled && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setReady(true);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!s) router.replace("/login");
      });
      return () => sub.subscription.unsubscribe();
    }
    void webStorage.get(DEMO_KEY).then((v) => {
      if (!v) router.replace("/login");
      else setReady(true);
    });
  }, [router, supabase]);

  async function signOut() {
    if (supabaseEnabled && supabase) await supabase.auth.signOut();
    await webStorage.remove(DEMO_KEY);
    router.push("/");
  }

  if (!ready) return null;

  const overflowActive = OVERFLOW.some((i) => isActive(pathname, i.href));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top bar. Desktop: full tab nav. Mobile: brand + theme + sign out only. */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/app" className="text-lg font-extrabold tracking-tight">
            PocketPulse
          </Link>

          {/* Desktop tab nav */}
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
              className="hidden text-muted-foreground md:inline-flex"
            >
              Sign out
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="text-muted-foreground md:hidden"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <LedgerProvider>
        {/* pb clears the fixed mobile bottom bar; none needed on desktop. */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 sm:px-6 md:pb-16">
          {children}
        </main>
      </LedgerProvider>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {PRIMARY.map((item) => (
            <BottomTab key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="More"
                className={cn(
                  "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  overflowActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="text-left">
                <SheetTitle>More</SheetTitle>
              </SheetHeader>
              <div className="mt-2 grid gap-1">
                {OVERFLOW.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    void signOut();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

function BottomTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  // First word keeps the label to one line at 375px (e.g. "Add" not "Add receipts").
  const short = item.label.split(" ")[0];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      <span>{short}</span>
    </Link>
  );
}
