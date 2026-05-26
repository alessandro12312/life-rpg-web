import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // In local dev the monorepo root is two levels up.
    // On Vercel (root directory = apps/web) __dirname already points to the right place,
    // so we resolve relative to the project root safely.
    root: process.env.VERCEL
      ? path.join(__dirname)         // On Vercel, apps/web IS the root
      : path.join(__dirname, "../.."), // Local monorepo: go up to repo root
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
