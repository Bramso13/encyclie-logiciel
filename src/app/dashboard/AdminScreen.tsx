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

  useEffect(() => {
    setPagination({ page: 1 });
    fetchQuotes();
  }, [fetchQuotes, setPagination, exerciseYear]);

  useEffect(() => {
    fetchBrokers();
    fetchUnderwriters();
    fetchReceivedMessages();
    fetchUnreadCount();
    fetch("/api/payment-installments/overdue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setOverdueCount(data.data.total || 0);
      })
      .catch(() => undefined);
  }, [
    fetchBrokers,
    fetchUnderwriters,
    fetchReceivedMessages,
    fetchUnreadCount,
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
    { id: "brokers", label: "Courtiers", badge: usersPagination.total || undefined },
    { id: "overduePayments", label: "Paiements en retard", badge: overdueCount || undefined },
    { id: "messages", label: "Messages", badge: unreadCount || undefined },
    { id: "correspondance", label: "Correspondance" },
    { id: "versions", label: "Historique des versions" },
  ];

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
        <KpiCard
          label="Courtiers"
          value={usersPagination.total}
          hint="Total API"
        />
        <KpiCard label="Paiements en retard" value={overdueCount} />
        <KpiCard label="Messages non lus" value={unreadCount} />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <ScrollTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        <div className="p-4 sm:p-6">
          {activeTab === "quotes" && (
            <AdminQuotesPanel
              onCreateQuote={() => setShowQuoteForm(true)}
              onQuoteCreated={(quote) => {
                setCreatedQuote(quote);
                setShowSuccessPage(true);
              }}
            />
          )}
          {activeTab === "brokers" && <AdminBrokersPanel />}
          {activeTab === "messages" && <AdminMessagesPanel />}
          {activeTab === "overduePayments" && <AdminOverduePaymentsPanel />}
          {activeTab === "versions" && <AdminVersionsPanel />}
          {activeTab === "correspondance" && <CorrespondanceTab />}
        </div>
      </div>
    </div>
  );
}
