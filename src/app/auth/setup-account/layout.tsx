import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuration du compte",
  description:
    "Configurez votre compte courtier Encyclie Construction. Définissez votre mot de passe et finalisez la création de votre espace professionnel.",
};

export default function SetupAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
