// 9.2 /features — six cards, each a heading + two/three sentences + one concrete example
// from the data pack. Close with "What it does not do". SCAFFOLD: copy stubbed; full
// layout is build step 10.
const FEATURES = [
  {
    title: "Reads receipts in any shape",
    body: "Till slips, emailed invoices, handwritten notes. Paste them as text or say them out loud in English, Afrikaans or isiZulu.",
  },
  {
    title: "Works out the VAT itself",
    body: "The AI reads words. Every rand you see was calculated in our own code, so it can be checked. One invoice claimed R689.85 of VAT on a R4,599.00 total. The correct portion is R599.87.",
  },
  {
    title: "Checks your paperwork",
    body: "Over R5,000 you need a full tax invoice. Between R50 and R5,000 a shorter one will do. We check every receipt against the rule for its amount and tell you what is missing, in rands.",
  },
  {
    title: "Catches double payments",
    body: "Two receipts from the same shop, same invoice number, same day, same card. Six things compared, six matched, R805.00 counted twice.",
  },
  {
    title: "Shows what repeats",
    body: "We read the word “monthly” off your invoices and multiply. Two subscriptions, R1,048.00 a month, R12,576.00 a year. We do not guess at patterns we cannot see.",
  },
  {
    title: "Writes the message to your supplier",
    body: "Every figure comes from our calculations, not from the AI. Copy it and send it yourself. Nothing leaves your device.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">What PocketPulse does</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-bold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">What it does not do:</span> no bank
        feeds, no SARS submission, no photo scanning yet, no tax advice.
      </p>
    </div>
  );
}
