import Link from "next/link";

// 9.1 Landing. Real figures from Part 7 — invented statistics are the fastest way to
// make a landing page look fake, and we have genuine ones.
// SCAFFOLD: structure + copy in place; visual polish (blue gradient tile, columns) is
// build step 10 (marketing pass).
export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="py-16">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Some of your VAT is not claimable. You just cannot see which.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          PocketPulse reads your receipts, works out the VAT itself, and tells you which
          claims your paperwork will not support. Built for South African small businesses.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Try it with sample receipts
          </Link>
          <Link href="/features" className="rounded-full border border-border px-6 py-3 font-semibold">
            See how it works
          </Link>
        </div>
      </section>

      {/* Proof strip — TODO(step 10): render as blue gradient card. */}
      <section className="rounded-3xl bg-accent p-8 text-accent-foreground">
        <p className="text-lg font-medium">
          <span className="font-extrabold">R721.18 of R1,547.67</span> — the VAT at risk in
          a sample batch of thirteen ordinary receipts. Three of them were missing something
          a tax invoice needs.
        </p>
      </section>

      {/* Placeholder for: The problem (3 cols) · How it works (4 steps) · Comparison table ·
          Honesty block. Copy lives in POCKETPULSE-BUILD.md §9.1. */}
      <section className="py-12 text-sm text-muted-foreground">
        Scaffold — remaining landing sections (problem, how-it-works, comparison, honesty
        block) are build step 10.
      </section>
    </div>
  );
}
