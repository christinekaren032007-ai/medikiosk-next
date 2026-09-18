import type { Metadata, Viewport } from "next";
import "./globals.css";
import StoreHydration from "@/components/shared/StoreHydration";

export const metadata: Metadata = {
  title: "Rapha — AI Clinical Intake Platform",
  description: "Prototype — uses simulated patient data. Not for real clinical use.",
};

// This is a touchscreen kiosk app — an explicit viewport (rather than
// relying on the framework default) avoids the browser's built-in
// tap-vs-double-tap-to-zoom delay/ambiguity that can make touch taps feel
// unresponsive on some devices.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreHydration />
        {children}
      </body>
    </html>
  );
}
