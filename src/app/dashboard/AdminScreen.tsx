"use client";

import { useEffect, useState } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import { useExerciseYearStore } from "@/lib/stores/exercise-year-store";
import useUsersStore from "@/lib/stores/users-store";
import useMessagesStore from "@/lib/stores/messages-store";
import QuoteForm from "@/components/quotes/QuoteForm";
import QuoteSuccessPage from "@/components/quotes/QuoteSuccessPage";
import CorrespondanceTab from "@/components/admin/CorrespondanceTab";
import { AdminBrokersPanel } from "@/components/admin/AdminBrokersPanel";
import { AdminQuotesPanel } from "@/components/admin/AdminQuotesPanel";
import { AdminMessagesPanel } from "@/components/admin/AdminMessagesPanel";
import { AdminOverduePaymentsPanel } from "@/components/admin/AdminOverduePaymentsPanel";
import { AdminVersionsPanel } from "@/components/admin/AdminVersionsPanel";
import { KpiCard, PageHeader } from "@/components/ui/Feedback";
import { ScrollTabs } from "@/components/ui/DataDisplay";
import { Button } from "@/components/ui/Controls";
import { usePermissions } from "@/lib/stores/permissions-store";
import type { AdminPermission } from "@/lib/permissions";

interface AdminScreenProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AdminScreen({ user }: AdminScreenProps) {
  const [activeTab, setActiveTab] = useState("quotes");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<any>(null);
  const [overdueCount, setOverdueCount] = useState(0);

  const { pagination: quotesPagination, fetchQuotes, setPagination } =
    useQuotesStore();
  const exerciseYear = useExerciseYearStore((state) => state.exerciseYear);
  const {
    pagination: usersPagination,
    fetchBrokers,
    fetchUnderwriters,
  } = useUsersStore();
  const { unreadCount, fetchReceivedMessages, fetchUnreadCount } =
    useMessagesStore();
  const { hasPermission, loaded: permissionsLoaded } = usePermissions();
  const can = (permission: AdminPermission) =>
    permissionsLoaded && hasPermission(permission);

  useEffect(() => {
    setPagination({ page: 1 });
    fetchQuotes();
  }, [fetchQuotes, setPagination, exerciseYear]);

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (can("USERS_ROLES")) {
      fetchBrokers();
      fetchUnderwriters();
    }
    if (can("MESSAGING")) {
      fetchReceivedMessages();
      fetchUnreadCount();
    }
    if (can("PRODUCTION")) {
      fetch("/api/payment-installments/overdue")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setOverdueCount(data.data.total || 0);
        })
        .catch(() => undefined);
    }
  }, [
    permissionsLoaded,
    fetchBrokers,
    fetchUnderwriters,
    fetchReceivedMessages,
    fetchUnreadCount,
    hasPermission,
  ]);

  if (showSuccessPage && createdQuote) {
    return (
      <QuoteSuccessPage
        quote={createdQuote}
        onBackToDashboard={() => {
          setShowSuccessPage(false);
          setCreatedQuote(null);
          fetchQuotes();
        }}
      />
    );
  }

  if (showQuoteForm) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Créer une demande de devis"
          actions={
            <Button variant="secondary" onClick={() => setShowQuoteForm(false)}>
              Fermer
            </Button>
          }
        />
        <div className="rounded-lg border border-line bg-white p-6">
          <QuoteForm
            onSuccess={(quote) => {
              setShowQuoteForm(false);
              setCreatedQuote(quote);
              setShowSuccessPage(true);
            }}
            onCancel={() => setShowQuoteForm(false)}
          />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "quotes", label: "Dossiers", badge: quotesPagination.total || undefined },
    can("USERS_ROLES")
      ? { id: "brokers", label: "Courtiers", badge: usersPagination.total || undefined }
      : null,
    can("PRODUCTION")
      ? {
          id: "overduePayments",
          label: "Paiements en retard",
          badge: overdueCount || undefined,
        }
      : null,
    can("MESSAGING")
      ? { id: "messages", label: "Messages", badge: unreadCount || undefined }
      : null,
    can("MESSAGING") ? { id: "correspondance", label: "Correspondance" } : null,
    { id: "versions", label: "Historique des versions" },
  ].filter((tab): tab is { id: string; label: string; badge?: number } => tab !== null);

  const visibleTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id ?? "quotes";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espace administrateur"
        description={`Bonjour ${user.name}. Retrouvez les dossiers, les paiements et les outils de production.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Dossiers"
          value={quotesPagination.total}
          hint="Total réel, toutes pages"
        />
        {can("USERS_ROLES") ? (
          <KpiCard
            label="Courtiers"
            value={usersPagination.total}
            hint="Total API"
          />
        ) : null}
        {can("PRODUCTION") ? (
          <KpiCard label="Paiements en retard" value={overdueCount} />
        ) : null}
        {can("MESSAGING") ? (
          <KpiCard label="Messages non lus" value={unreadCount} />
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <ScrollTabs tabs={tabs} value={visibleTab} onChange={setActiveTab} />
        <div className="p-4 sm:p-6">
          {visibleTab === "quotes" && (
            <AdminQuotesPanel
              onCreateQuote={() => setShowQuoteForm(true)}
              onQuoteCreated={(quote) => {
                setCreatedQuote(quote);
                setShowSuccessPage(true);
              }}
            />
          )}
          {visibleTab === "brokers" && <AdminBrokersPanel />}
          {visibleTab === "messages" && <AdminMessagesPanel />}
          {visibleTab === "overduePayments" && <AdminOverduePaymentsPanel />}
          {visibleTab === "versions" && <AdminVersionsPanel />}
          {visibleTab === "correspondance" && <CorrespondanceTab />}
        </div>
      </div>
    </div>
  );
}
