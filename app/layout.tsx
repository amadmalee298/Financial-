import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
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
  applicationName: "My Investment",
  // iOS "Add to Home Screen": full-screen app with a translucent status bar
  // (the header pads for the notch with env(safe-area-inset-top)).
  appleWebApp: { capable: true, title: "Investment", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // Next only emits the unprefixed tag; iOS before 16.4 needs Apple's own.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  // Extend under the notch / home indicator; layouts use safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={fontSans.variable}>
      <body className="font-sans antialiased">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
