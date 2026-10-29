import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@landora/analytics", "@landora/ingest", "@landora/rules", "@landora/schema"],
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  // Server code reads the synthetic dataset, rule packs and sample REAXML feeds from the repo at runtime.
  outputFileTracingIncludes: {
    "/**": ["../../data/synthetic/dataset.json", "../../data/synthetic/reaxml/*.xml", "../../samples/reaxml/*.xml", "../../rule-packs/**/*.json"],
  },
  poweredByHeader: false,
  // "Saturday plan" was renamed "Inspections"; keep old links working.
  async redirects() {
    return [{ source: "/timeline", destination: "/inspections", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
