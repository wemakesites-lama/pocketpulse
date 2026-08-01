"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { webStorage, DEMO_KEY } from "@/lib/storage.web";

// PART 10 · DEMO SIGN-IN. This is a GATE, not authentication — and it says so on screen.
// Any non-empty email + password succeeds; so does Skip. On success set pp_demo and route
// to /app. No Next middleware, no cookies (see spec: not a security boundary).
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function enter() {
    await webStorage.set(DEMO_KEY, "1");
    router.push("/app");
  }

  function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim() && password.trim()) void enter();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Sign in to PocketPulse</h1>
        <form onSubmit={signIn} className="mt-6 space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            Sign in
          </button>
        </form>
        <button
          onClick={() => void enter()}
          className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-medium"
        >
          Skip and use sample data
        </button>
        <p className="mt-5 text-xs text-muted-foreground">
          Demo sign-in. No account is created, nothing is sent to a server, and nothing is
          stored beyond this browser.
        </p>
      </div>
    </div>
  );
}
