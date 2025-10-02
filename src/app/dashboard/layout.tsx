import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord - Encyclie Construction",
  description:
    "Gérez vos devis, contrats d'assurance et clients depuis votre tableau de bord Encyclie Construction.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
