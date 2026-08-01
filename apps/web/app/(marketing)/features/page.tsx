// 9.2 /features — six cards, each a heading + two/three sentences + one concrete example
// from the data pack. Close with "What it does not do".
import { ScanLine, Calculator, ShieldCheck, Copy, Repeat, Mail, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScanLine,
    title: "Reads receipts in any shape",
    body: "Till slips, emailed invoices, handwritten notes. Paste them as text or say them out loud in English, Afrikaans or isiZulu.",
  },
  {
    icon: Calculator,
    title: "Works out the VAT itself",
    body: "The AI reads words. Every rand you see was calculated in our own code, so it can be checked. One invoice claimed R689.85 of VAT on a R4,599.00 total. The correct portion is R599.87.",
  },
  {
    icon: ShieldCheck,
    title: "Checks your paperwork",
    body: "Over R5,000 you need a full tax invoice. Between R50 and R5,000 a shorter one will do. We check every receipt against the rule for its amount and tell you what is missing, in rands.",
  },
  {
    icon: Copy,
    title: "Catches double payments",
    body: "Two receipts from the same shop, same invoice number, same day, same card. Six things compared, six matched, R805.00 counted twice.",
  },
  {
    icon: Repeat,
    title: "Shows what repeats",
    body: "We read the word “monthly” off your invoices and multiply. Two subscriptions, R1,048.00 a month, R12,576.00 a year. We do not guess at patterns we cannot see.",
  },
  {
    icon: Mail,
    title: "Writes the message to your supplier",
    body: "Every figure comes from our calculations, not from the AI. Copy it and send it yourself. Nothing leaves your device.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">What PocketPulse does</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          );
        })}
      </div>
      <Card className="mt-10 bg-secondary/60 p-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">What it does not do:</span> no bank
          feeds, no SARS submission, no photo scanning yet, no tax advice.
        </p>
      </Card>
    </div>
  );
}
