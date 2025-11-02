import type { Metadata } from "next";
// Removed next/font/google imports to avoid Turbopack internal font errors
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ClientProvider } from "@/components/providers/client-provider";
import { Web3Provider } from "@/components/providers/web3-provider";

// Using system fonts to avoid runtime font fetch issues during development

export const metadata: Metadata = {
  title: "Credor - Social Betting Platform",
  description: "A modern social betting platform where you can challenge friends and place bets on sports matches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <Web3Provider>
          <ClientProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ClientProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
