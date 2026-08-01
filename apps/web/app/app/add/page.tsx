"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BATCHES } from "@pocketpulse/core";
import { Loader2, ArrowRight, Camera } from "lucide-react";
import { useLedger } from "@/components/ledger-provider";
import { analyseSample, analysePaste, scanImages } from "@/lib/analyse.client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// 11.8 Add receipts. Sample · Photo scan · Paste · Reading. Nothing happens until you act.
export default function AddPage() {
  const router = useRouter();
  const { load } = useLedger();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [scanPct, setScanPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function runSample(id: "A" | "B" | "C", label: string) {
    setError(null);
    setBusy(label);
    const data = await analyseSample(id);
    load(data);
    router.push("/app/review");
  }

  async function runPaste() {
    if (!text.trim()) return setError("Paste at least one receipt to check.");
    setError(null);
    setBusy("your receipts");
    const out = await analysePaste(text);
    if (out.ok) {
      load(out.data);
      router.push("/app/review");
    } else {
      setBusy(null);
      setError(out.error.message);
    }
  }

  async function runScan(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(files.length === 1 ? "your photo" : `${files.length} photos`);
    setScanPct(0);
    const out = await scanImages(Array.from(files), (i, total, f) =>
      setScanPct(Math.round(((i + f) / total) * 100)),
    );
    setScanPct(null);
    if (out.ok) {
      load(out.data);
      router.push("/app/review");
    } else {
      setBusy(null);
      setError(out.error.message);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Add receipts</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Snap a photo, paste the text, or try one of our examples. Nothing happens until you
        act. We read each receipt, work out the VAT ourselves, and show you anything that
        looks wrong. Nothing is filed or sent anywhere.
      </p>

      {busy && (
        <Card className="mt-6 p-6" aria-live="polite">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {scanPct !== null ? `Reading ${busy}… ${scanPct}%` : `Reading ${busy}…`}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {scanPct !== null
              ? "Recognising the text on your device — the photo never leaves your phone."
              : "Working out the VAT and checking the paperwork on your device."}
          </p>
        </Card>
      )}

      {!busy && (
        <>
          {/* Samples */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {BATCHES.map((b) => (
              <button
                key={b.id}
                onClick={() => runSample(b.id, b.label)}
                className="group rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{b.label}</div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>
              </button>
            ))}
          </div>

          {/* Photo scan */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => runScan(e.target.files)}
          />
          <Card className="mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Scan a receipt photo</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  We read the text on your device and check it like any other receipt. Clear,
                  well-lit, straight-on photos work best.
                </p>
              </div>
            </div>
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="rounded-full sm:shrink-0">
              Take / choose photo
            </Button>
          </Card>

          {/* Paste */}
          <Card className="mt-6 p-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"Paste one or more receipts here…\n\nSeparate receipts with a blank line or ---"}
              className="resize-y font-mono text-sm"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Up to 20 at a time, in English, Afrikaans or isiZulu.
              </span>
              <Button onClick={runPaste} className="w-full rounded-full sm:w-auto">
                Check these receipts
              </Button>
            </div>
          </Card>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </>
      )}
    </section>
  );
}
