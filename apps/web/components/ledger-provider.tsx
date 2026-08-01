"use client";

import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import {
  ledgerReducer,
  initialLedgerState,
  type LedgerState,
  type LedgerAction,
} from "@pocketpulse/core";
import type { AnalyseData } from "@/lib/analyse.client";

const STORAGE_KEY = "pp_ledger";

interface LedgerContextValue {
  state: LedgerState;
  dispatch: React.Dispatch<LedgerAction>;
  load: (data: AnalyseData) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ledgerReducer, initialLedgerState);
  const hydrated = useRef(false);

  // Hydrate once from localStorage.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", state: JSON.parse(raw) as LedgerState });
    } catch {
      /* ignore corrupt storage */
    }
    hydrated.current = true;
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  const load = (data: AnalyseData) =>
    dispatch({
      type: "LOAD",
      rows: data.ledger,
      insights: data.insights,
      batchSummary: data.batch_summary,
      unread: data.unread,
      modelId: data.model.model_id,
      loadedAt: new Date().toISOString(),
    });

  return <LedgerContext.Provider value={{ state, dispatch, load }}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}
