import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const fontSans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "My Investment", template: "%s · My Investment" },
  description: "Personal investment tracker for Thai stocks",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={fontSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
