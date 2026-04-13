import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep the compiler scoped to this app folder to avoid scanning the whole workspace.
    root: process.cwd(),
  },
};

export default nextConfig;
