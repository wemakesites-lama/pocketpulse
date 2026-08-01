"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase.client";
import { webStorage, DEMO_KEY } from "@/lib/storage.web";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";

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
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-lg font-extrabold tracking-tight">
          PocketPulse
        </Link>

        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>

          {supabaseEnabled ? (
            step === "email" ? (
              <form onSubmit={sendCode} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@business.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? "Sending…" : "Email me a sign-in code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verify} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Sign-in code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="text-center font-mono text-lg tracking-[0.4em]"
                  />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? "Checking…" : "Verify and sign in"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setNotice(null);
                  }}
                  className="w-full"
                >
                  Use a different email
                </Button>
              </form>
            )
          ) : (
            // Fallback demo gate (no Supabase configured)
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim() && password.trim()) void demoEnter();
                }}
                className="mt-6 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="demo-email">Email</Label>
                  <Input
                    id="demo-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@business.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-password">Password</Label>
                  <Input
                    id="demo-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Any value — this is a demo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Sign in
                </Button>
              </form>
              <Button variant="outline" onClick={() => void demoEnter()} className="mt-3 w-full">
                Skip and use sample data
              </Button>
            </>
          )}

          {notice && (
            <p className="mt-4 rounded-lg bg-accent p-3 text-xs text-accent-foreground" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <p className="mt-5 text-xs text-muted-foreground">
            {supabaseEnabled
              ? "We email you a one-time code — no password to remember. Your receipts are saved to your account."
              : "Demo sign-in. No account is created, nothing is stored beyond this browser."}
          </p>
        </Card>
      </div>
    </div>
  );
}
