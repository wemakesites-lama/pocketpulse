"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Upload/retrieval helpers for slip photos in the private `slips` storage bucket.
// Objects live under `{uid}/…` so the storage RLS policies (see migration 0002) let a
// user touch only their own slips. Nothing here is public: display goes through a
// short-lived signed URL.

export const SLIPS_BUCKET = "slips";

function extFor(file: File): string {
  const m = file.type.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("heic")) return "heic";
  if (m.includes("heif")) return "heif";
  return "jpg";
}

// Upload one slip to the user's folder. Returns the bucket-relative path on success, or
// null on any failure — a failed upload must never break the scan flow (the receipt is
// still analysed from its OCR text; it just won't have a retrievable photo).
export async function uploadSlip(
  sb: SupabaseClient,
  uid: string,
  file: File,
  sourceId: string,
): Promise<string | null> {
  const path = `${uid}/${Date.now()}-${sourceId}.${extFor(file)}`;
  try {
    const { error } = await sb.storage.from(SLIPS_BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    return error ? null : path;
  } catch {
    return null;
  }
}

// Mint a short-lived signed URL to display a private slip (default 1 hour). Returns null
// if the path is gone or the caller isn't allowed to read it.
export async function signedSlipUrl(
  sb: SupabaseClient,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  try {
    const { data, error } = await sb.storage.from(SLIPS_BUCKET).createSignedUrl(path, expiresIn);
    return error || !data ? null : data.signedUrl;
  } catch {
    return null;
  }
}
