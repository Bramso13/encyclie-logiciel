"use client";

import { authClient, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "./AppShell";
import { LoadingState } from "./Feedback";

export function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState active label="Chargement" />
      </div>
    );
  }

  return (
    <AppShell
      userName={session.user.name || session.user.email || "Utilisateur"}
      userRole={session.user.role}
      onSignOut={async () => {
        await signOut();
        router.push("/login");
      }}
    >
      {children}
    </AppShell>
  );
}
