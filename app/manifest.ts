import type { MetadataRoute } from "next";

/** PWA basics only — clean Add-to-Home-Screen. No service worker on purpose. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIticker",
    short_name: "AIticker",
    description: "Rip packs. Build your binder. Fight the index.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
