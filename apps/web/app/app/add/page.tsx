"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BATCHES } from "@pocketpulse/core";
import { Loader2, ArrowRight, Camera, Mic, Square } from "lucide-react";
import { useLedger } from "@/components/ledger-provider";
import { analyseSample, analysePaste, analyseVoice, transcribeAudio, scanImages } from "@/lib/analyse.client";
import { startRecording, isRecordingSupported, type Recorder } from "@/lib/record.client";
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

  // Speak a receipt (STT). Record → transcribe → edit → check.
  const [micReady, setMicReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<Recorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMicReady(isRecordingSupported());
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
    };
  }, []);

  async function toggleRecord() {
    if (recording) {
      // Stop → transcribe.
      if (timerRef.current) clearInterval(timerRef.current);
      const rec = recorderRef.current;
      recorderRef.current = null;
      setRecording(false);
      if (!rec) return;
      setTranscribing(true);
      try {
        const audio = await rec.stop();
        const out = await transcribeAudio(audio);
        if (out.ok) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${out.text}` : out.text));
        } else {
          setError(out.error.message);
        }
      } catch {
        setError("We couldn't finish the recording. Please try again.");
      } finally {
        setTranscribing(false);
      }
      return;
    }
    // Start.
    setError(null);
    try {
      recorderRef.current = await startRecording();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("We couldn't reach your microphone. Check that your browser has permission to use it.");
    }
  }

  async function runVoice() {
    if (!transcript.trim()) return setError("Say or type a receipt first, then check it.");
    setError(null);
    setBusy("your spoken receipt");
    const out = await analyseVoice(transcript);
    if (out.ok) {
      load(out.data);
      router.push("/app/review");
    } else {
      setBusy(null);
      setError(out.error.message);
    }
  }

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
        looks wrong. Photos you scan are saved securely to your own account so you can
        view the original slip later — we never file or submit anything on your behalf.
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
              ? "Recognising the text on your device, then saving the photo to your account."
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
                  We read the text on your device, then save the photo to your account so you can
                  pull up the original slip any time. Clear, well-lit, straight-on photos work best.
                </p>
              </div>
            </div>
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="rounded-full sm:shrink-0">
              Take / choose photo
            </Button>
          </Card>

          {/* Speak a receipt (STT) */}
          {micReady && (
            <Card className="mt-6 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Speak a receipt</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Read it out — merchant, date, total and VAT — in English, Afrikaans or
                      isiZulu. We transcribe the words and check it like any other receipt.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={toggleRecord}
                  disabled={transcribing}
                  variant={recording ? "destructive" : "outline"}
                  className="rounded-full sm:shrink-0"
                  aria-live="polite"
                >
                  {transcribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transcribing…
                    </>
                  ) : recording ? (
                    <>
                      <Square className="mr-2 h-4 w-4 fill-current" />
                      Stop ({seconds}s)
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start recording
                    </>
                  )}
                </Button>
              </div>

              {recording && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
                  Listening… tap stop when you&apos;re done.
                </div>
              )}

              {(transcript || transcribing) && (
                <div className="mt-4">
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={4}
                    placeholder="Your spoken receipt will appear here — edit anything we misheard before checking."
                    className="resize-y text-sm"
                    aria-label="Transcript"
                  />
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-muted-foreground">
                      Check what we heard — you can fix any words before checking.
                    </span>
                    <Button
                      onClick={runVoice}
                      disabled={recording || transcribing || !transcript.trim()}
                      className="w-full rounded-full sm:w-auto"
                    >
                      Check this receipt
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

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
