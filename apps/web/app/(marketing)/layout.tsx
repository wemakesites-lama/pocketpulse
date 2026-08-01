import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";

// PART 9 — marketing pages use a SEPARATE layout from the app. Do not put the app's
// pill nav on the landing page. Static, no AI calls, no data fetching.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            PocketPulse
          </Link>
          <MarketingNav />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
          PocketPulse · Built by 3Devs for Guild SA Buildathon 01 · A learning project. Not
          tax or accounting advice.
        </div>
      </footer>
    </div>
  );
}
