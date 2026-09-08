"use client";

import { useSession, signOut, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminScreen from "./AdminScreen";
import BrokerScreen from "./BrokerScreen";
import ClientScreen from "./ClientScreen";
import { AppShell } from "@/components/ui/AppShell";
import { LoadingState } from "@/components/ui/Feedback";

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState active label="Chargement de votre espace" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = session.user.role;
  const userData = {
    name: session.user.name || "",
    email: session.user.email || "",
    role: userRole || "",
    companyName: session.user.companyName,
  };

  const renderDashboardContent = () => {
    switch (userRole) {
      case "ADMIN":
        return <AdminScreen user={userData} />;
      case "BROKER":
      case "UNDERWRITER":
        return <BrokerScreen user={userData} />;
      default:
        return <ClientScreen user={userData} />;
    }
  };

  return (
    <AppShell
      userName={session.user.name || session.user.email || "Utilisateur"}
      userRole={session.user.role}
      onSignOut={handleSignOut}
    >
      {renderDashboardContent()}
    </AppShell>
  );
}
