import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "unavatar.io" },
      { hostname: "ui-avatars.com" },
      { hostname: "pbs.twimg.com" },
    ],
  },
};

export default nextConfig;
