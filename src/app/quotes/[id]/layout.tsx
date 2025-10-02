import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Détails du devis",
  description:
    "Consultez et gérez les détails de votre devis d'assurance construction. Accédez au formulaire, aux calculs RCD, à la lettre d'intention et au suivi de paiement.",
};

export default function QuoteDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
