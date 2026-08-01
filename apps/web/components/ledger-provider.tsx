"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ledgerReducer,
  initialLedgerState,
  type LedgerState,
  type LedgerAction,
} from "@pocketpulse/core";
import type { AnalyseData } from "@/lib/analyse.client";
import { getSupabase } from "@/lib/supabase.client";
import { loadLatestBatch, insertBatch, updateBatch } from "@/lib/persistence";

const LOCAL_KEY = "pp_ledger";

interface LedgerContextValue {
  state: LedgerState;
  dispatch: React.Dispatch<LedgerAction>;
  load: (data: AnalyseData) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [state, dispatch] = useReducer(ledgerReducer, initialLedgerState);
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  const batchId = useRef<string | null>(null);
  const freshLoad = useRef(false); // a new analysis -> insert a new batch row
  const lastSaved = useRef<string>("");
  const ready = useRef(false);

  // Track the auth session (Supabase mode).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Hydrate the working batch (from Supabase when signed in, else from localStorage).
  useEffect(() => {
    if (!supabase) {
      try {
        const raw = window.localStorage.getItem(LOCAL_KEY);
        if (raw) {
          lastSaved.current = raw;
          dispatch({ type: "HYDRATE", state: JSON.parse(raw) as LedgerState });
        }
      } catch {
        /* ignore */
      }
      ready.current = true;
      return;
    }
    if (session === undefined) return; // auth still resolving
    if (!session) {
      dispatch({ type: "RESET" });
      batchId.current = null;
      lastSaved.current = "";
      ready.current = true;
      return;
    }
    loadLatestBatch(supabase).then((b) => {
      if (b) {
        batchId.current = b.id;
        lastSaved.current = JSON.stringify(b.state);
        dispatch({ type: "HYDRATE", state: b.state });
      } else {
        batchId.current = null;
      }
      ready.current = true;
    });
  }, [supabase, session]);

  // Persist (debounced). Skips no-op saves via a JSON fingerprint.
  useEffect(() => {
    if (!ready.current) return;
    const json = JSON.stringify(state);
    if (json === lastSaved.current) return;

    const timer = window.setTimeout(async () => {
      if (supabase && session) {
        if (freshLoad.current || !batchId.current) {
          const id = await insertBatch(supabase, state);
          if (id) batchId.current = id;
          freshLoad.current = false;
        } else {
          await updateBatch(supabase, batchId.current, state);
        }
        lastSaved.current = json;
      } else if (!supabase) {
        try {
          window.localStorage.setItem(LOCAL_KEY, json);
          lastSaved.current = json;
        } catch {
          /* ignore quota */
        }
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, supabase, session]);

  const load = (data: AnalyseData) => {
    freshLoad.current = true; // next persist inserts a new batch
    dispatch({
      type: "LOAD",
      rows: data.ledger,
      insights: data.insights,
      batchSummary: data.batch_summary,
      unread: data.unread,
      modelId: data.model.model_id,
      loadedAt: new Date().toISOString(),
    });
  };

  return <LedgerContext.Provider value={{ state, dispatch, load }}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}
