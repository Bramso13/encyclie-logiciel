"use client";

import { useSession, signOut, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminScreen from "./AdminScreen";
import BrokerScreen from "./BrokerScreen";
import ClientScreen from "./ClientScreen";
import Image from "next/image";
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const renderDashboardContent = () => {
    const userRole = session.user.role;
    const userData = {
      name: session.user.name || "",
      email: session.user.email || "",
      role: userRole || "",
      companyName: session.user.companyName,
    };

    switch (userRole) {
      case "ADMIN":
        return <AdminScreen user={userData} />;
      case "BROKER":
        return <BrokerScreen user={userData} />;
      case "UNDERWRITER":
        return <BrokerScreen user={userData} />; // Les underwriters utilisent le même dashboard que les brokers pour l'instant
      default:
        return <ClientScreen user={userData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
            <Image src="/couleur_1.png" alt="Logo" className="h-12" width={100} height={100} />
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{session.user.name}</span>
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {session.user.role}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{renderDashboardContent()}</div>
      </main>
    </div>
  );
}
