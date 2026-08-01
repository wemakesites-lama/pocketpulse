import Link from "next/link";

// PART 9 — marketing pages use a SEPARATE layout from the app. Do not put the app's
// pill nav on the landing page. Static, no AI calls, no data fetching.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          PocketPulse
        </Link>
        <nav className="flex items-center gap-2 rounded-full border border-border bg-card p-1">
          <Link href="/features" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary">
            Features
          </Link>
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary">
            Login
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Try it with sample receipts
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        PocketPulse · Built by 3Devs for Guild SA Buildathon 01 · A learning project. Not
        tax or accounting advice.
      </footer>
    </div>
  );
}
