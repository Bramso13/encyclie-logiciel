import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion - Encyclie Construction",
  description:
    "Connectez-vous à votre espace Encyclie Construction pour gérer vos devis et contrats d'assurance construction.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
