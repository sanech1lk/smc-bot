import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SentryUser } from "@/components/sentry-user";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { themeInitScript } from "@/components/theme";

// Inter carries Cyrillic and has the tighter, more even rhythm the interface
// is designed around; the system stack is only a fallback while it loads.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Kelma — мессенджер для стройки",
  description: "Чат, фото, задачи и смета по объектам и этапам стройки",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kelma"
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }
    ],
    apple: "/icons/icon-192.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d12"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Runs before paint so the stored theme applies without a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-bg text-text-primary antialiased tracking-tightish">
        <Providers>
          <SentryUser />
          {children}
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
