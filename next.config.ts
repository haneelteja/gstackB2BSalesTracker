import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Force Turbopack root to this repo. Otherwise Next may pick a parent folder
// (e.g. if a stray package-lock.json exists under the user profile) and skip
// this directory's .env.local — breaking Supabase URL/key at runtime.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
