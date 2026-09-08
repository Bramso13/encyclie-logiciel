import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { ToastHost } from "@/components/ui/ToastHost";

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
    default: "Encyclie Construction - CRM Assurance",
    template: "%s | Encyclie Construction",
  },
  description:
    "Plateforme CRM de gestion d'assurances construction pour les courtiers et les clients. Simplifiez vos démarches d'assurance avec nos outils modernes de gestion de devis et contrats.",
  keywords: ["assurance", "construction", "CRM", "courtier", "devis", "contrat", "RCD"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={<div className="p-8 text-sm text-ink-muted">Chargement…</div>}>
          {children}
        </Suspense>
        <ToastHost />
      </body>
    </html>
  );
}
