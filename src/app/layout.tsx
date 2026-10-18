import type { Metadata, Viewport } from "next";
// Removed next/font/google imports to avoid Turbopack internal font errors
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ClientProvider } from "@/components/providers/client-provider";
import { QueryProvider } from "@/components/providers/query-provider";

// Using system fonts to avoid runtime font fetch issues during development

export const metadata: Metadata = {
  title: "Credor - Social Betting Platform",
  description: "A modern social betting platform where you can challenge friends and place bets on sports matches.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Credor",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1A7431",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <QueryProvider>
          <ClientProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
