import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuration du compte - Encyclie Construction",
  description:
    "Configurez votre compte courtier Encyclie Construction. Définissez votre mot de passe et accédez à votre espace professionnel.",
};

export default function SetupAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
