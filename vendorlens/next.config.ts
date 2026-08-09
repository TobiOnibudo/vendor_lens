import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// App lives in vendorlens/ but git root is ai_builders/; without this, Turbopack
// resolves modules from the repo root and walks up to ~/package.json.
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
