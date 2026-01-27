import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove "output: export" for Electron build - we need server-side features
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["serialport"],
};

export default nextConfig;
