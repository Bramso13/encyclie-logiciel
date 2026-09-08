"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Controls";
import { DataTable, PaginationBar } from "@/components/ui/DataDisplay";
import { EmptyState, LoadingState } from "@/components/ui/Feedback";
import { formatDateFr, formatEur } from "@/lib/ui/labels";
import { notify } from "@/lib/ui/notify";

type OverduePayment = {
  id: string;
  installmentNumber: number;
  amountTTC: number;
  dueDate: string;
  daysOverdue: number;
  reminderCount: number;
  schedule: {
    quote: {
      id?: string;
      reference: string;
      companyData?: { companyName?: string };
      broker: { name: string };
    };
  };
};

export function AdminOverduePaymentsPanel() {
  const [payments, setPayments] = useState<OverduePayment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchOverdue = async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/payment-installments/overdue?page=${nextPage}&limit=${nextLimit}`,
      );
      const data = await response.json();
      if (data.success) {
        setPayments(data.data.payments || []);
        setTotal(data.data.total || 0);
        setPage(data.data.page || nextPage);
        setLimit(data.data.limit || nextLimit);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch {
      notify("Impossible de charger les paiements en retard.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const markPaid = async (paymentId: string) => {
    try {
      const response = await fetch(
        `/api/payment-installments/${paymentId}/mark-paid`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "La mise à jour du paiement a échoué.");
      }
      notify(data.message || "Paiement marqué comme réglé.", "success");
      fetchOverdue();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "La mise à jour a échoué.",
        "error",
      );
    }
  };

  const sendReminder = async (paymentId: string) => {
    if (!window.confirm("Envoyer un rappel de paiement au courtier ?")) return;
    try {
      const response = await fetch(
        `/api/payment-installments/${paymentId}/send-reminder`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "L'envoi du rappel a échoué.");
      }
      notify(data.message || "Rappel envoyé.", "success");
      fetchOverdue();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "L'envoi du rappel a échoué.",
        "error",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {total} paiement{total > 1 ? "s" : ""} en retard
        </p>
        <Button variant="secondary" onClick={() => fetchOverdue()}>
          Actualiser
        </Button>
      </div>
      {loading ? (
        <LoadingState active label="Chargement des paiements en retard" />
      ) : payments.length === 0 ? (
        <EmptyState
          title="Aucun paiement en retard"
          description="Tous les appels de prime suivis sont à jour."
        />
      ) : (
        <DataTable
          compact
          footer={
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
              itemLabel="paiement en retard"
            />
          }
        >
          <table>
            <thead>
              <tr>
                <th>Dossier</th>
                <th>Échéance</th>
                <th>Montant</th>
                <th>Retard</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div className="font-medium">
                      {payment.schedule.quote.reference}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {payment.schedule.quote.companyData?.companyName || "—"}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {payment.schedule.quote.broker.name}
                    </div>
                  </td>
                  <td>
                    <div>n° {payment.installmentNumber}</div>
                    <div className="text-xs text-ink-muted">
                      {formatDateFr(payment.dueDate)}
                    </div>
                  </td>
                  <td className="font-medium">
                    {formatEur(payment.amountTTC)}
                  </td>
                  <td>
                    {payment.daysOverdue} j
                    {payment.reminderCount > 0 ? (
                      <div className="text-xs text-ink-muted">
                        {payment.reminderCount} rappel
                        {payment.reminderCount > 1 ? "s" : ""}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="text-left text-sm font-semibold underline decoration-brand underline-offset-4"
                        onClick={() => sendReminder(payment.id)}
                      >
                        Relancer
                      </button>
                      <button
                        type="button"
                        className="text-left text-sm font-semibold text-emerald-800"
                        onClick={() => markPaid(payment.id)}
                      >
                        Réglé
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </div>
  );
}
