"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BATCHES } from "@pocketpulse/core";
import { useLedger } from "@/components/ledger-provider";
import { analyseSample, analysePaste } from "@/lib/analyse.client";

// 11.8 Add receipts. Empty · Paste · Reading. Nothing happens until "Check".
export default function AddPage() {
  const router = useRouter();
  const { load } = useLedger();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSample(id: "A" | "B" | "C", label: string) {
    setError(null);
    setBusy(label);
    const data = await analyseSample(id);
    load(data);
    router.push("/app/review");
  }

  async function runPaste() {
    if (!text.trim()) {
      setError("Paste at least one receipt to check.");
      return;
    }
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

  return (
    <section className="py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Add receipts</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Paste your receipts as text, or try one of our examples to see how it works. Nothing
        happens until you press Check. We read each receipt, work out the VAT ourselves, and
        show you anything that looks wrong. Nothing is filed or sent anywhere.
      </p>

      {busy && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-sm font-medium">Reading {busy}…</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Working out the VAT and checking the paperwork on your device.
          </p>
        </div>
      )}

      {!busy && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {BATCHES.map((b) => (
              <button
                key={b.id}
                onClick={() => runSample(b.id, b.label)}
                className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary"
              >
                <div className="font-semibold">{b.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"Paste one or more receipts here…\n\nSeparate receipts with a blank line or ---"}
              className="w-full resize-y rounded-xl border border-input bg-background p-3 font-mono text-sm"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Up to 20 at a time, in English, Afrikaans or isiZulu.
              </span>
              <button
                onClick={runPaste}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Check these receipts
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </>
      )}
    </section>
  );
}
