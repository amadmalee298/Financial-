import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "My Investment",
    short_name: "Investment",
    description: "บันทึกและติดตามพอร์ตการลงทุนหุ้นไทย",
    lang: "th",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "บันทึกซื้อขาย", url: "/transactions?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "พอร์ตการลงทุน", url: "/portfolio", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
