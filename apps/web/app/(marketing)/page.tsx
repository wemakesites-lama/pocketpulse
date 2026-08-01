import Link from "next/link";
import { ScanLine, Calculator, ShieldCheck, PenLine, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 9.1 Landing. Real figures from Part 7 — invented statistics are the fastest way to
// make a landing page look fake, and we have genuine ones.
const PROBLEMS = [
  {
    title: "Your accounting software trusts your receipts.",
    body: "It calculates VAT correctly and files the return. It never checks whether the document behind the number is valid.",
  },
  {
    title: "SARS does check.",
    body: "If a required field is missing, the whole claim on that document can be turned down, with a penalty on top. It is not a partial deduction.",
  },
  {
    title: "You find out months later.",
    body: "By which time the supplier has forgotten the sale and a corrected invoice is much harder to get.",
  },
];

const STEPS = [
  { icon: ScanLine, title: "Paste or speak", body: "Add your receipts as text in English, Afrikaans or isiZulu." },
  { icon: Calculator, title: "We work out the VAT", body: "Every rand is calculated in code, not by the AI — so it can be checked." },
  { icon: ShieldCheck, title: "We check the paperwork", body: "Each document is tested against what SARS needs for its amount." },
  { icon: PenLine, title: "You fix what matters", body: "Correct what needs correcting, and we write the message to the supplier." },
];

const COMPARISON: [string, string][] = [
  ["Tells you what your VAT is", "Tells you which of it you may lose"],
  ["Assumes your documents are valid", "Checks each one against the rules for its value"],
  ["Flags a problem", "Writes the email that fixes it"],
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero */}
      <section className="py-14 sm:py-20">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
          Some of your VAT is not claimable. You just cannot see which.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          PocketPulse reads your receipts, works out the VAT itself, and tells you which
          claims your paperwork will not support. Built for South African small businesses.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/login">Try it with sample receipts</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link href="/features">See how it works</Link>
          </Button>
        </div>
      </section>

      {/* Proof strip — blue gradient card */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[color:var(--blue-dk)] p-6 text-white shadow-lg sm:p-10">
        <p className="max-w-3xl text-lg font-medium sm:text-xl">
          <span className="text-2xl font-extrabold tabular-nums sm:text-3xl">R721.18 of R1,547.67</span>
          <br className="hidden sm:block" /> — the VAT at risk in a sample batch of thirteen
          ordinary receipts. Three of them were missing something a tax invoice needs.
        </p>
      </section>

      {/* The problem */}
      <section className="py-14 sm:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Why this happens</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Card key={p.title} className="p-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {i + 1}
              </div>
              <h3 className="mt-4 font-bold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="pb-14 sm:pb-20">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Comparison */}
      <section className="pb-14 sm:pb-20">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Not another accounting tool
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Accounting software
            </div>
            <ul className="mt-4 space-y-3">
              {COMPARISON.map(([left]) => (
                <li key={left} className="text-sm text-muted-foreground">
                  {left}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-primary/30 bg-primary/[0.04] p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-primary">PocketPulse</div>
            <ul className="mt-4 space-y-3">
              {COMPARISON.map(([, right]) => (
                <li key={right} className="flex items-start gap-2 text-sm font-medium">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {right}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* Honesty block */}
      <section className="pb-16">
        <Card className="bg-secondary/60 p-6 sm:p-8">
          <p className="max-w-3xl text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Written honestly:</span> PocketPulse is
            a learning project, not an accounting platform and not a tax adviser. It checks
            documents against published invoice requirements and tells you what is missing. What
            you do about it is between you and your accountant.
          </p>
        </Card>
      </section>
    </div>
  );
}
