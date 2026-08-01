"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { webStorage, DEMO_KEY } from "@/lib/storage.web";
import { LedgerProvider } from "@/components/ledger-provider";
import { getSupabase, supabaseEnabled } from "@/lib/supabase.client";

// PART 11 app shell. Auth guard: a Supabase session when configured, else the
// localStorage demo gate. Client-side (not a security boundary).
const NAV = [
  { href: "/app", label: "Overview" },
  { href: "/app/add", label: "Add receipts" },
  { href: "/app/review", label: "Review" },
  { href: "/app/paperwork", label: "Paperwork" },
  { href: "/app/repeating", label: "Repeating" },
  { href: "/app/approved", label: "Approved" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/app" className="text-lg font-extrabold tracking-tight">
          PocketPulse
        </Link>
        {/* Top pill nav — flex + rounded-full wrapper (3.5). Wraps + scrolls on phone (PART 12). */}
        <nav className="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-card p-1">
          {NAV.map((item) => {
            const active =
              item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => void signOut()} className="text-sm font-medium text-muted-foreground">
          Sign out
        </button>
      </header>
      <LedgerProvider>
        <main className="mx-auto max-w-6xl px-6 pb-16">{children}</main>
      </LedgerProvider>
    </div>
  );
}
