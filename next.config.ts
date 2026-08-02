import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Engineer portraits (freely licensed, via Wikimedia Commons)
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // Company logos via Google's favicon service (redirects to gstatic)
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "*.gstatic.com" },
      // GitHub avatars for Get Rated / Versus community cards
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
