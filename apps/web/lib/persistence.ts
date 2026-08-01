"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { batchTotals, type LedgerState } from "@pocketpulse/core";

// Persistence for the working batch. Replaces localStorage with a `batches` row per user
// (RLS-protected). The full LedgerState lives in `payload`; headline metrics are
// denormalised so batches can be listed/filtered without unpacking JSON.

export interface StoredBatch {
  id: string;
  state: LedgerState;
}

function headline(state: LedgerState) {
  const t = batchTotals(state.rows);
  return {
    status: state.rows.some((r) => r.approved) ? "approved" : "draft",
    record_count: t.record_count,
    gross_total: t.gross_total,
    total_vat: t.total_vat,
    vat_at_risk: t.vat_at_risk,
    model_id: state.modelId,
    batch_summary: state.batchSummary,
  };
}

export async function loadLatestBatch(sb: SupabaseClient): Promise<StoredBatch | null> {
  const { data, error } = await sb
    .from("batches")
    .select("id, payload")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id as string, state: data.payload as LedgerState };
}

// Insert a new working batch (called on each fresh analysis). Returns the new id.
export async function insertBatch(sb: SupabaseClient, state: LedgerState): Promise<string | null> {
  const { data: userData } = await sb.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await sb
    .from("batches")
    .insert({ user_id: uid, payload: state, ...headline(state) })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

// Update the working batch in place (called, debounced, on edits/approval).
export async function updateBatch(sb: SupabaseClient, id: string, state: LedgerState): Promise<void> {
  const patch: Record<string, unknown> = { payload: state, ...headline(state) };
  if (state.rows.some((r) => r.approved)) patch.approved_at = new Date().toISOString();
  await sb.from("batches").update(patch).eq("id", id);
}
