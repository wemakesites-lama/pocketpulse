// 9.2 /features — grouped, honest coverage of what actually ships. Every figure here
// is a real one from the data pack (Part 7); mechanisms without a verified figure are
// described plainly rather than dressed up with an invented statistic.
import {
  ScanLine,
  Camera,
  Mic,
  Calculator,
  ShieldCheck,
  Tags,
  Repeat,
  Copy,
  TrendingUp,
  PenLine,
  FileText,
  Mail,
  Download,
  Lock,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

type Feature = { icon: LucideIcon; title: string; body: string };
type Section = { heading: string; blurb?: string; features: Feature[] };

const SECTIONS: Section[] = [
  {
    heading: "Getting receipts in",
    blurb: "However the receipt reached you, it goes through the same checks.",
    features: [
      {
        icon: ScanLine,
        title: "Reads receipts in any shape",
        body: "Till slips, emailed invoices, handwritten notes. Paste or type up to twenty at a time, in English, Afrikaans or isiZulu, and we split them apart for you.",
      },
      {
        icon: Camera,
        title: "Scan a photo on your device",
        body: "Point your camera at a slip. The text is read on your phone — the image never leaves it — then checked like any other receipt. Works best on clear, printed English receipts.",
      },
      {
        icon: Mic,
        title: "Or just say it out loud",
        body: "Read a receipt to your phone — shop, date, total, VAT — in English, Afrikaans or isiZulu. We transcribe it, you fix anything we misheard, then we check it.",
      },
    ],
  },
  {
    heading: "What we work out",
    blurb: "The AI only reads words. Every rand below is calculated in our own code, so it can be checked.",
    features: [
      {
        icon: Calculator,
        title: "Works out the VAT itself",
        body: "One invoice claimed R689.85 of VAT on a R4,599.00 total. The correct portion is R599.87. We compute the 15% share ourselves and show you the difference.",
      },
      {
        icon: ShieldCheck,
        title: "Checks your paperwork",
        body: "Over R5,000 you need a full tax invoice; R50 to R5,000 a shorter one; under R50 a till slip is enough. We test every receipt against the rule for its amount and name what is missing, in rands.",
      },
      {
        icon: Tags,
        title: "Sorts where the money went",
        body: "Every receipt is filed into one of twelve categories — fuel, telecoms, software, professional services and the rest — so your overview shows what you spent, and on what.",
      },
      {
        icon: Repeat,
        title: "Adds up what repeats",
        body: "We read the word “monthly” off your invoices and multiply by twelve. Two subscriptions, R1,048.00 a month, R12,576.00 a year. We do not guess at patterns we cannot see.",
      },
    ],
  },
  {
    heading: "What we catch",
    blurb: "Every check runs in code and points at the exact receipts behind it.",
    features: [
      {
        icon: Copy,
        title: "Catches double payments",
        body: "Two receipts from the same shop, same total, same day — R805.00 counted twice. We also flag near-misses a day or two apart, in case one was billed again.",
      },
      {
        icon: TrendingUp,
        title: "Spots amounts that don’t fit",
        body: "Once you have five or more receipts, anything far larger than the rest of the batch gets a second look — so an extra zero or a mistyped total does not slip through.",
      },
      {
        icon: Calculator,
        title: "Notices when the numbers don’t tie up",
        body: "Line items that don’t add up to the total, a printed VAT figure that is wrong, a large cash payment that needs extra proof — each is flagged with the amount at stake.",
      },
    ],
  },
  {
    heading: "Staying in control",
    blurb: "The system flags; you decide. Nothing is filed or sent anywhere.",
    features: [
      {
        icon: PenLine,
        title: "You approve every rand",
        body: "Correct a wrong VAT figure or add a missing date and every total updates instantly. You cannot approve a batch while a serious problem is still open.",
      },
      {
        icon: FileText,
        title: "Shows its working",
        body: "Open any receipt to see the original slip beside the computed facts: VAT as printed versus what it should be, what can be claimed, and exactly which field is missing.",
      },
      {
        icon: Mail,
        title: "Tells you what to ask for",
        body: "For each problem we name the exact thing to request — “a corrected tax invoice with the right VAT amount”, “a tax invoice showing their VAT number”. You send it to your supplier yourself.",
      },
      {
        icon: Download,
        title: "Exports for your bookkeeper",
        body: "Download the reviewed ledger as a CSV, or view the approved batch as raw structured data. It leaves the way your accountant expects it.",
      },
    ],
  },
  {
    heading: "Built to be trusted",
    features: [
      {
        icon: Lock,
        title: "Your work is saved to your account",
        body: "Sign in with just your email — a link or a code, no password to forget. Your batches are kept privately against your account for next time.",
      },
      {
        icon: WifiOff,
        title: "Keeps working when the AI is down",
        body: "The sample receipts run entirely in your browser, and if the AI service is unreachable we fall back to findings written straight from the checks. Never a blank screen.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">What PocketPulse does</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The model reads. The code calculates. The model explains. You approve. Every rand you
        see was worked out in our own code, so it can be checked.
      </p>

      <div className="mt-12 space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{section.heading}</h2>
            {section.blurb && (
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{section.blurb}</p>
            )}
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {section.features.map((f) => {
                const Icon = f.icon;
                return (
                  <Card key={f.title} className="p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-bold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Card className="mt-12 bg-secondary/60 p-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">What it does not do:</span> no bank
          feeds, no SARS submission, no PDF import, no tax advice. Photo scanning reads printed
          English text only; VAT logic assumes the 15% standard rate. It checks documents against
          published invoice requirements and tells you what is missing — what you do about it is
          between you and your accountant.
        </p>
      </Card>
    </div>
  );
}
