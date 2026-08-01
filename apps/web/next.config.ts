import type { NextConfig } from "next";

// transpilePackages lets Next compile @pocketpulse/core's raw TypeScript directly.
// Core ships raw TS — no build step, no dist — so a rules change appears in the UI
// immediately (see spec 2.3).
const config: NextConfig = { transpilePackages: ["@pocketpulse/core"] };

export default config;
