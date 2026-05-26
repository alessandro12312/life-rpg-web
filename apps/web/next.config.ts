import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Must always point to the monorepo root so it matches
    // Vercel's outputFileTracingRoot (/vercel/path0).
    root: path.join(__dirname, "../.."),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
