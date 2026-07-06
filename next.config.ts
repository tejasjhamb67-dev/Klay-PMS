import type { NextConfig } from "next";

// GITHUB_PAGES=1 builds a fully static export served under /Klay-PMS
// (github.io project pages). Vercel builds are unaffected (no env set).
const forPages = process.env.GITHUB_PAGES === "1";
const basePath = forPages ? "/Klay-PMS" : "";

const nextConfig: NextConfig = {
  ...(forPages
    ? {
        output: "export" as const,
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
