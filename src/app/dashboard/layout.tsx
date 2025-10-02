import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord",
  description:
    "Tableau de bord Encyclie Construction. Gérez vos devis, contrats d'assurance, clients et suivez l'avancement de vos dossiers d'assurance construction.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
