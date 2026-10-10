import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
  async rewrites() {
    return [
      { source: "/@:name/activity", destination: "/profile/:name/activity" },
      { source: "/@:name", destination: "/profile/:name" },
      { source: "/uploads/:path*", destination: "/media/uploads/:path*" },
      { source: "/assets/:path*", destination: "/media/assets/:path*" },
      { source: "/fonts/custom/:path*", destination: "/media/fonts/custom/:path*" },
    ];
  },
};

export default nextConfig;
