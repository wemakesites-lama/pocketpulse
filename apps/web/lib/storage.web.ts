"use client";

import type { StorageAdapter } from "@pocketpulse/core";

// 2.4 The web implementation of core's StorageAdapter. Async even though localStorage
// is not, so a native adapter can drop in later. Guards against SSR (no window).
export const webStorage: StorageAdapter = {
  async get(key) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  async set(key, value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  async remove(key) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

// Demo gate key (PART 10). This is a gate, not authentication.
export const DEMO_KEY = "pp_demo";
