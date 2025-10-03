import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte",
  description:
    "Créez votre compte courtier sur Encyclie Construction. Rejoignez notre plateforme de gestion d'assurances construction et commencez à gérer vos devis et contrats.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
