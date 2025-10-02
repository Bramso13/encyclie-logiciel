import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte - Encyclie Construction",
  description:
    "Créez votre compte courtier Encyclie Construction pour accéder à notre plateforme de gestion d'assurances construction.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
