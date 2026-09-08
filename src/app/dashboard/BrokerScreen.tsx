"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useQuotesStore from "@/lib/stores/quotes-store";
import useProductsStore from "@/lib/stores/products-store";
import useMessagesStore from "@/lib/stores/messages-store";
import QuotesList from "@/components/quotes/QuotesList";
import QuoteForm from "@/components/quotes/QuoteForm";
import QuoteSuccessPage from "@/components/quotes/QuoteSuccessPage";
import { Button } from "@/components/ui/Controls";
import { PageHeader, KpiCard, EmptyState, LoadingState } from "@/components/ui/Feedback";
import { ScrollTabs } from "@/components/ui/DataDisplay";
import { formatDateFr } from "@/lib/ui/labels";

interface BrokerScreenProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function BrokerScreen({ user }: BrokerScreenProps) {
  const [activeTab, setActiveTab] = useState("quotes");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<any>(null);
  const router = useRouter();

  const { quotes, pagination, fetchQuotes } = useQuotesStore();
  const { fetchActiveProducts } = useProductsStore();
  const {
    receivedMessages,
    unreadCount,
    loading: messagesLoading,
    fetchReceivedMessages,
    fetchUnreadCount,
    markMessageAsRead,
    deleteMessage,
  } = useMessagesStore();

  useEffect(() => {
    fetchQuotes();
    fetchActiveProducts();
    fetchReceivedMessages();
    fetchUnreadCount();
  }, [
    fetchQuotes,
    fetchActiveProducts,
    fetchReceivedMessages,
    fetchUnreadCount,
  ]);

  const stats = {
    quotesEnCours: quotes.filter(
      (q) => q.status === "IN_PROGRESS" || q.status === "SUBMITTED",
    ).length,
    offresEmises: quotes.filter((q) => q.status === "OFFER_SENT").length,
    contratsActifs: quotes.filter((q) => q.status === "ACCEPTED").length,
  };

  if (showSuccessPage && createdQuote) {
    return (
      <QuoteSuccessPage
        quote={createdQuote}
        onBackToDashboard={() => router.push(`/quotes/${createdQuote.id}`)}
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espace courtier"
        description={`Bonjour ${user.name}. Créez un devis, suivez l'offre et les documents du dossier.`}
        actions={
          <Button onClick={() => setShowQuoteForm(true)}>
            Créer une demande de devis
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Dossiers (total)"
          value={pagination.total}
          hint="Toutes pages"
        />
        <KpiCard
          label="En cours (page affichée)"
          value={stats.quotesEnCours}
        />
        <KpiCard label="Offres envoyées (page affichée)" value={stats.offresEmises} />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <ScrollTabs
          tabs={[
            { id: "quotes", label: "Mes dossiers" },
            {
              id: "messages",
              label: "Messages",
              badge: unreadCount || undefined,
            },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
        <div className="p-4 sm:p-6">
          {activeTab === "quotes" && (
            <QuotesList onQuoteSelect={(id) => router.push(`/quotes/${id}`)} />
          )}
          {activeTab === "messages" && (
            <div className="space-y-3">
              {unreadCount > 0 ? (
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      receivedMessages
                        .filter((m) => !m.isRead)
                        .forEach((m) => markMessageAsRead(m.id));
                    }}
                  >
                    Marquer tout comme lu
                  </Button>
                </div>
              ) : null}
              {messagesLoading && receivedMessages.length === 0 ? (
                <LoadingState active label="Chargement des messages" />
              ) : receivedMessages.length === 0 ? (
                <EmptyState
                  title="Aucun message"
                  description="Les messages d'Encyclie apparaîtront ici."
                />
              ) : (
                receivedMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-lg border p-4 ${
                      message.isRead
                        ? "border-line bg-white"
                        : "border-brand/40 bg-brand/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-ink">{message.title}</h3>
                        <p className="mt-1 text-sm text-ink-muted">
                          {message.message}
                        </p>
                        <p className="mt-2 text-xs text-ink-muted">
                          {formatDateFr(message.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        {!message.isRead ? (
                          <Button
                            variant="secondary"
                            onClick={() => markMessageAsRead(message.id)}
                          >
                            Marquer comme lu
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          className="!text-rose-700 hover:!bg-rose-50"
                          onClick={() => deleteMessage(message.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
