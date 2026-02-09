import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    // Exclude unused heavy packages from the server bundle
    serverComponentsHmrCache: false,
  },
  // Disable OG image generation (saves ~2 MiB in the Worker bundle)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
