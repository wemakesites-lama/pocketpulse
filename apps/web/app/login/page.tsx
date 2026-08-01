"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase.client";
import { webStorage, DEMO_KEY } from "@/lib/storage.web";

// Email OTP sign-in via Supabase. On free-tier default email the message carries a
// magic LINK (click to sign in, handled by detectSessionInUrl); once custom SMTP is set,
// the same flow delivers a 6-digit CODE you enter below. Both paths are supported.
export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabase();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Fallback demo gate when Supabase is not configured.
  const [password, setPassword] = useState("");
  async function demoEnter() {
    await webStorage.set(DEMO_KEY, "1");
    router.push("/app");
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Enter your email.");
    setBusy(true);
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/app` },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setStep("code");
    setNotice("We emailed you a sign-in code. Enter it below, or click the link in the email.");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return setError("Enter the code from your email.");
    setBusy(true);
    const { error } = await supabase!.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/app");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Sign in to PocketPulse</h1>

        {supabaseEnabled ? (
          step === "email" ? (
            <form onSubmit={sendCode} className="mt-6 space-y-3">
              <input
                type="email"
                autoComplete="email"
                placeholder="you@business.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Sending…" : "Email me a sign-in code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-3">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-lg tracking-widest"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Checking…" : "Verify and sign in"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setNotice(null); }}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium"
              >
                Use a different email
              </button>
            </form>
          )
        ) : (
          // Fallback demo gate (no Supabase configured)
          <>
            <form onSubmit={(e) => { e.preventDefault(); if (email.trim() && password.trim()) void demoEnter(); }} className="mt-6 space-y-3">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
              <button type="submit" className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">Sign in</button>
            </form>
            <button onClick={() => void demoEnter()} className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-medium">
              Skip and use sample data
            </button>
          </>
        )}

        {notice && <p className="mt-4 rounded-xl bg-accent p-3 text-xs text-accent-foreground">{notice}</p>}
        {error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}

        <p className="mt-5 text-xs text-muted-foreground">
          {supabaseEnabled
            ? "We email you a one-time code — no password to remember. Your receipts are saved to your account."
            : "Demo sign-in. No account is created, nothing is stored beyond this browser."}
        </p>
      </div>
    </div>
  );
}
