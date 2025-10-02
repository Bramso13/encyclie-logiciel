import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devis - Encyclie Construction",
  description:
    "Consultez et gérez vos devis d'assurance construction RCD. Suivez l'avancement de vos dossiers en temps réel.",
};

export default function QuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
