import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Encyclie Construction",
    default: "Encyclie Construction - CRM Logiciel d'Assurance",
  },
  description:
    "Plateforme CRM pour la gestion des devis et contrats d'assurance construction. Solution moderne pour les courtiers et leurs clients.",
  keywords: [
    "assurance construction",
    "CRM assurance",
    "devis assurance",
    "courtier assurance",
    "RCD",
    "responsabilité civile décennale",
    "gestion contrats",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </body>
    </html>
  );
}
