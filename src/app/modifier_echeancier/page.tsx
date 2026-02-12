"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import type { PaymentInstallment, PaymentSchedule } from "@/lib/types";

type QuoteWithSchedule = {
  id: string;
  reference: string;
  status: string;
  formData?: {
    companyName?: string;
    companyForm?: { companyName?: string };
  };
  product?: { name: string; code: string };
  broker?: { name: string | null; companyName: string | null };
  paymentSchedule?: PaymentSchedule | null;
  contract?: { id: string; reference: string; status: string } | null;
};

const QUOTE_STATUSES = [
  "DRAFT", "INCOMPLETE", "SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED",
  "OFFER_READY", "OFFER_SENT", "ACCEPTED", "REJECTED", "EXPIRED",
] as const;

const CONTRACT_STATUSES = [
  "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED", "PENDING_RENEWAL",
] as const;

type EditableColumn = keyof Pick<
  PaymentInstallment,
  "dueDate" | "amountHT" | "taxAmount" | "amountTTC" | "rcdAmount" | "pjAmount" | "feesAmount" | "resumeAmount" | "periodStart" | "periodEnd"
>;

function toInputDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function ModifierEcheancierPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [payments, setPayments] = useState<Partial<PaymentInstallment>[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [quoteDetails, setQuoteDetails] = useState<{
    reference: string;
    status: string;
    contract?: { reference: string; status: string } | null;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkColumn, setBulkColumn] = useState<{
    field: EditableColumn;
    value: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!session && !isPending) router.push("/login");
  }, [session, isPending, router]);

  // Charger tous les devis (sans filtre échéancier)
  useEffect(() => {
    if (!session) return;
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/quotes?limit=500&page=1");
        const data = await res.json();
        if (data?.data?.quotes) {
          const rcdQuotes = data.data.quotes.filter((q: QuoteWithSchedule) =>
            (q.reference || "").toUpperCase().startsWith("RCD")
          );
          setQuotes(rcdQuotes);
          const currentInList = selectedQuoteId && rcdQuotes.some((q: QuoteWithSchedule) => q.id === selectedQuoteId);
          if (rcdQuotes.length > 0 && (!selectedQuoteId || !currentInList)) {
            setSelectedQuoteId(rcdQuotes[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, [session]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedQuoteId),
    [quotes, selectedQuoteId],
  );

  const filteredQuotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((quote) => {
      const name = (quote.formData?.companyName ?? "").toLowerCase();
      const formName = (quote.formData?.companyForm?.companyName ?? "").toLowerCase();
      return name.includes(q) || formName.includes(q);
    });
  }, [quotes, searchQuery]);

  useEffect(() => {
    if (filteredQuotes.length === 0) return;
    const isSelectedInFiltered = filteredQuotes.some((q) => q.id === selectedQuoteId);
    if (!isSelectedInFiltered) {
      setSelectedQuoteId(filteredQuotes[0].id);
    }
  }, [filteredQuotes, selectedQuoteId]);

  // Charger les détails du devis (référence, statut, contrat)
  useEffect(() => {
    if (!selectedQuoteId) {
      setQuoteDetails(null);
      return;
    }
    fetch(`/api/quotes/${selectedQuoteId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const q = data?.data;
        if (q) {
          setQuoteDetails({
            reference: q.reference ?? "",
            status: q.status ?? "",
            contract: q.contract
              ? { reference: q.contract.reference ?? "", status: q.contract.status ?? "" }
              : null,
          });
        } else {
          setQuoteDetails(null);
        }
      })
      .catch(() => setQuoteDetails(null));
  }, [selectedQuoteId]);

  // Charger l'échéancier du devis sélectionné ; si absent, le générer depuis calculatedPremium (comme PremiumCallTab)
  useEffect(() => {
    if (!selectedQuoteId) {
      setPayments([]);
      return;
    }

    const setPaymentsFromSchedule = (schedule: { payments?: PaymentInstallment[] }) => {
      setSelectedIds(new Set());
      if (!schedule?.payments?.length) {
        setPayments([]);
        return;
      }
      setPayments(
        schedule.payments.map((p: PaymentInstallment) => ({
          id: p.id,
          installmentNumber: p.installmentNumber,
          dueDate: p.dueDate,
          amountHT: p.amountHT,
          taxAmount: p.taxAmount,
          amountTTC: p.amountTTC,
          rcdAmount: p.rcdAmount,
          pjAmount: p.pjAmount,
          feesAmount: p.feesAmount,
          resumeAmount: p.resumeAmount,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          status: p.status,
        })),
      );
    };

    const createScheduleFromCalculation = async (): Promise<{ payments?: PaymentInstallment[] } | null> => {
      const premiumRes = await fetch(`/api/quotes/${selectedQuoteId}/calculated-premium`);
      if (!premiumRes.ok) return null;
      const premiumData = await premiumRes.json();
      const calculationResult = premiumData?.data?.calculatedPremium ?? premiumData?.calculatedPremium;
      if (!calculationResult?.echeancier?.echeances?.length) return null;

      const createRes = await fetch(`/api/quotes/${selectedQuoteId}/payment-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calculationResult }),
      });
      if (!createRes.ok) return null;
      const createData = await createRes.json();
      return createData?.data ?? null;
    };

    setScheduleLoading(true);
    setMessage(null);

    fetch(`/api/quotes/${selectedQuoteId}/payment-schedule`)
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 404) return { data: null };
        return res.json().then((d) => Promise.reject(d));
      })
      .then(async (data) => {
        const schedule = data?.data;
        if (schedule?.payments?.length) {
          setPaymentsFromSchedule(schedule);
          return;
        }
        // Échéancier non trouvé : générer depuis le calcul de prime (même logique que PremiumCallTab)
        const created = await createScheduleFromCalculation();
        if (created) {
          setPaymentsFromSchedule(created);
        } else {
          setPayments([]);
        }
      })
      .catch(async () => {
        // En cas d'erreur (ex. 404), tenter de créer l'échéancier depuis calculatedPremium
        const created = await createScheduleFromCalculation();
        if (created) {
          setPaymentsFromSchedule(created);
        } else {
          setPayments([]);
        }
      })
      .finally(() => setScheduleLoading(false));
  }, [selectedQuoteId]);

  const totals = useMemo(() => {
    let ht = 0,
      tax = 0,
      ttc = 0;
    payments.forEach((p) => {
      ht += Number(p.amountHT) || 0;
      tax += Number(p.taxAmount) || 0;
      ttc += Number(p.amountTTC) || 0;
    });
    return {
      totalAmountHT: round2(ht),
      totalTaxAmount: round2(tax),
      totalAmountTTC: round2(ttc),
    };
  }, [payments]);

  const updatePayment = (
    index: number,
    field: keyof PaymentInstallment,
    value: unknown,
  ) => {
    setPayments((prev) => {
      const next = [...prev];
      const p = { ...next[index], [field]: value };
      if (
        field === "amountHT" ||
        field === "taxAmount" ||
        field === "amountTTC"
      ) {
        const ht =
          field === "amountHT" ? Number(value) : (p.amountHT as number);
        const tax =
          field === "taxAmount" ? Number(value) : (p.taxAmount as number);
        const ttc =
          field === "amountTTC" ? Number(value) : (p.amountTTC as number);
        if (field !== "amountHT") p.amountHT = ht;
        if (field !== "taxAmount") p.taxAmount = tax;
        if (field !== "amountTTC") p.amountTTC = ttc;
      }
      next[index] = p;
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedQuoteId || payments.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/quotes/${selectedQuoteId}/payment-schedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payments: payments.map((p) => ({
              id: p.id,
              dueDate: p.dueDate
                ? typeof p.dueDate === "string"
                  ? p.dueDate
                  : new Date(p.dueDate).toISOString().slice(0, 10)
                : undefined,
              amountHT: p.amountHT,
              taxAmount: p.taxAmount,
              amountTTC: p.amountTTC,
              rcdAmount: p.rcdAmount,
              pjAmount: p.pjAmount,
              feesAmount: p.feesAmount,
              resumeAmount: p.resumeAmount,
              periodStart: p.periodStart
                ? typeof p.periodStart === "string"
                  ? p.periodStart
                  : new Date(p.periodStart).toISOString().slice(0, 10)
                : undefined,
              periodEnd: p.periodEnd
                ? typeof p.periodEnd === "string"
                  ? p.periodEnd
                  : new Date(p.periodEnd).toISOString().slice(0, 10)
                : undefined,
            })),
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "ok",
          text: data?.message ?? "Échéancier enregistré.",
        });
        if (data?.data?.payments) {
          setPayments(
            data.data.payments.map((p: PaymentInstallment) => ({
              id: p.id,
              installmentNumber: p.installmentNumber,
              dueDate: p.dueDate,
              amountHT: p.amountHT,
              taxAmount: p.taxAmount,
              amountTTC: p.amountTTC,
              rcdAmount: p.rcdAmount,
              pjAmount: p.pjAmount,
              feesAmount: p.feesAmount,
              resumeAmount: p.resumeAmount,
              periodStart: p.periodStart,
              periodEnd: p.periodEnd,
              status: p.status,
            })),
          );
        }
      } else {
        setMessage({
          type: "err",
          text: data?.error ?? "Erreur lors de l'enregistrement.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const applyBulkColumn = (field: EditableColumn, value: string) => {
    if (!value && (field === "dueDate" || field === "periodStart" || field === "periodEnd")) return;
    const isNum = ["amountHT", "taxAmount", "amountTTC", "rcdAmount", "pjAmount", "feesAmount", "resumeAmount"].includes(field);
    const val = isNum ? (parseFloat(value) || 0) : value;
    setPayments((prev) => prev.map((p) => ({ ...p, [field]: val })));
    setBulkColumn(null);
  };

  const deleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    const remaining = payments.filter((p) => p.id && !selectedIds.has(p.id));
    if (remaining.length === 0) {
      setMessage({ type: "err", text: "Il doit rester au moins une échéance." });
      return;
    }
    setPayments(remaining);
    setSelectedIds(new Set());
    if (!selectedQuoteId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/quotes/${selectedQuoteId}/payment-schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: remaining.map((p) => ({
            id: p.id,
            dueDate: p.dueDate ? (typeof p.dueDate === "string" ? p.dueDate : new Date(p.dueDate).toISOString().slice(0, 10)) : undefined,
            amountHT: p.amountHT,
            taxAmount: p.taxAmount,
            amountTTC: p.amountTTC,
            rcdAmount: p.rcdAmount,
            pjAmount: p.pjAmount,
            feesAmount: p.feesAmount,
            resumeAmount: p.resumeAmount,
            periodStart: p.periodStart ? (typeof p.periodStart === "string" ? p.periodStart : new Date(p.periodStart).toISOString().slice(0, 10)) : undefined,
            periodEnd: p.periodEnd ? (typeof p.periodEnd === "string" ? p.periodEnd : new Date(p.periodEnd).toISOString().slice(0, 10)) : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: `${count} échéance(s) supprimée(s).` });
        setPayments(
          (data.data?.payments ?? remaining).map((p: PaymentInstallment) => ({
            id: p.id,
            installmentNumber: p.installmentNumber,
            dueDate: p.dueDate,
            amountHT: p.amountHT,
            taxAmount: p.taxAmount,
            amountTTC: p.amountTTC,
            rcdAmount: p.rcdAmount,
            pjAmount: p.pjAmount,
            feesAmount: p.feesAmount,
            resumeAmount: p.resumeAmount,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
            status: p.status,
          })),
        );
      } else {
        setMessage({ type: "err", text: data?.error ?? "Erreur lors de la suppression." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuote = async () => {
    if (!selectedQuoteId || !quoteDetails) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/quotes/${selectedQuoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: quoteDetails.reference, status: quoteDetails.status }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: "Devis mis à jour." });
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === selectedQuoteId
              ? { ...q, reference: quoteDetails.reference, status: quoteDetails.status }
              : q
          )
        );
      } else {
        setMessage({ type: "err", text: data?.error ?? "Erreur." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContract = async () => {
    if (!selectedQuoteId || !quoteDetails?.contract) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/quotes/${selectedQuoteId}/contract`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteDetails.contract),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: "Contrat mis à jour." });
      } else {
        setMessage({ type: "err", text: data?.error ?? "Erreur." });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(payments.map((p) => p.id).filter(Boolean) as string[]));
  const deselectAll = () => setSelectedIds(new Set());

  const addPaymentLine = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const newLine: Partial<PaymentInstallment> = {
      id: `new-${Date.now()}`,
      installmentNumber: payments.length + 1,
      dueDate: today,
      amountHT: 0,
      taxAmount: 0,
      amountTTC: 0,
      rcdAmount: 0,
      pjAmount: 0,
      feesAmount: 0,
      resumeAmount: 0,
      periodStart: today,
      periodEnd: today,
      status: "PENDING",
    };
    if (payments.length === 0 && selectedQuoteId) {
      setSaving(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/quotes/${selectedQuoteId}/payment-schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ createEmpty: true }),
        });
        if (res.ok) {
          setPayments([newLine]);
          setMessage({ type: "ok", text: "Échéancier créé. Complétez la ligne et enregistrez." });
        } else {
          const data = await res.json();
          setMessage({ type: "err", text: data?.error ?? "Impossible de créer l'échéancier." });
        }
      } finally {
        setSaving(false);
      }
    } else {
      setPayments((prev) =>
        prev.map((p, i) => ({ ...p, installmentNumber: i + 1 })).concat([{ ...newLine, installmentNumber: prev.length + 1 }])
      );
    }
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-600">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Image
                src="/couleur_1.png"
                alt="Logo"
                className="h-10 w-auto"
                width={100}
                height={40}
              />
              <a
                href="/dashboard"
                className="text-sm text-blue-600 hover:underline"
              >
                ← Retour tableau de bord
              </a>
            </div>
            <div className="text-sm text-gray-600">
              {session.user?.name} · Modifier un échéancier
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          Modifier un échéancier
        </h1>

        {loading ? (
          <p className="text-gray-500">Chargement des devis...</p>
        ) : quotes.length === 0 ? (
          <p className="text-gray-500">Aucun devis dans la base.</p>
        ) : (
          <>
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="search-company" className="font-medium text-gray-700">
                  Recherche (société) :
                </label>
                <input
                  id="search-company"
                  type="search"
                  placeholder="Nom de la société..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[240px] max-w-[320px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="font-medium text-gray-700">
                  Devis / contrat :
                </label>
                {filteredQuotes.length === 0 ? (
                  <span className="text-gray-500 text-sm">
                    Aucun devis ne correspond à la recherche.
                  </span>
                ) : (
                  <select
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[320px]"
                  >
                    {filteredQuotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {[q.formData?.companyName ?? q.formData?.companyForm?.companyName ?? "—", q.reference].filter(Boolean).join(" · ")}
                        {q.product?.name ? ` — ${q.product.name}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {scheduleLoading && (
                  <span className="text-sm text-gray-500">Chargement échéancier…</span>
                )}
                {!scheduleLoading && selectedQuoteId && payments.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {payments.length} échéance(s)
                  </span>
                )}
                {!scheduleLoading && selectedQuoteId && payments.length === 0 && quotes.some((q) => q.id === selectedQuoteId) && (
                  <>
                    <span className="text-sm text-amber-600">
                      Aucun échéancier pour ce devis
                    </span>
                    <button
                      type="button"
                      onClick={addPaymentLine}
                      disabled={saving}
                      className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      + Ajouter une échéance
                    </button>
                  </>
                )}
                {!scheduleLoading && selectedQuoteId && payments.length > 0 && (
                  <button
                    type="button"
                    onClick={addPaymentLine}
                    className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Ajouter une échéance
                  </button>
                )}
              </div>
            </div>

            {message && (
              <div
                className={`mb-4 px-4 py-2 rounded ${
                  message.type === "ok"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Référence et statut du devis */}
            {quoteDetails && (
              <div className="mb-4 p-4 bg-white rounded-lg shadow space-y-3">
                <h3 className="font-medium text-gray-900">Devis</h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <div>
                    <label className="block text-xs text-gray-500">Référence</label>
                    <input
                      type="text"
                      value={quoteDetails.reference}
                      onChange={(e) =>
                        setQuoteDetails((d) => (d ? { ...d, reference: e.target.value } : null))
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm w-40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Statut</label>
                    <select
                      value={quoteDetails.status}
                      onChange={(e) =>
                        setQuoteDetails((d) => (d ? { ...d, status: e.target.value } : null))
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm w-48"
                    >
                      {QUOTE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveQuote}
                    disabled={saving}
                    className="mt-5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Enregistrer devis
                  </button>
                </div>
                {quoteDetails.contract && (
                  <>
                    <h3 className="font-medium text-gray-900 pt-2">Contrat</h3>
                    <div className="flex flex-wrap gap-4 items-center">
                      <div>
                        <label className="block text-xs text-gray-500">Référence contrat</label>
                        <input
                          type="text"
                          value={quoteDetails.contract.reference}
                          onChange={(e) =>
                            setQuoteDetails((d) =>
                              d?.contract
                                ? { ...d, contract: { ...d.contract!, reference: e.target.value } }
                                : d
                            )
                          }
                          className="border border-gray-300 rounded px-3 py-2 text-sm w-40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Statut contrat</label>
                        <select
                          value={quoteDetails.contract.status}
                          onChange={(e) =>
                            setQuoteDetails((d) =>
                              d?.contract
                                ? { ...d, contract: { ...d.contract!, status: e.target.value } }
                                : d
                            )
                          }
                          className="border border-gray-300 rounded px-3 py-2 text-sm w-48"
                        >
                          {CONTRACT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveContract}
                        disabled={saving}
                        className="mt-5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Enregistrer contrat
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {payments.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-2 bg-gray-100 border-b flex items-center justify-between">
                  <span className="text-sm text-gray-600">Modifier toute une colonne :</span>
                  <div className="flex gap-2 flex-wrap">
                    {(
                      [
                        ["dueDate", "Date éch."],
                        ["amountHT", "HT"],
                        ["taxAmount", "Taxe"],
                        ["amountTTC", "TTC"],
                        ["periodStart", "Début"],
                        ["periodEnd", "Fin"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setBulkColumn((b) =>
                              b?.field === field ? null : { field, value: "" }
                            )
                          }
                          className={`text-xs px-2 py-1 rounded ${
                            bulkColumn?.field === field
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {label}
                        </button>
                        {bulkColumn?.field === field && (
                          <>
                            <input
                              type={["dueDate", "periodStart", "periodEnd"].includes(field) ? "date" : "number"}
                              step="0.01"
                              value={bulkColumn.value}
                              onChange={(e) =>
                                setBulkColumn((b) => (b ? { ...b, value: e.target.value } : null))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  applyBulkColumn(field, bulkColumn.value);
                                }
                              }}
                              className="w-24 border border-gray-300 rounded px-1 py-0.5 text-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => applyBulkColumn(field, bulkColumn.value)}
                              className="text-xs px-2 py-0.5 bg-green-600 text-white rounded"
                            >
                              OK
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-2 bg-amber-50 border-b flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={addPaymentLine}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Ajouter une échéance
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Tout sélectionner
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Tout désélectionner
                  </button>
                  <span className="text-gray-500 text-sm">
                    {selectedIds.size} sélectionnée(s)
                  </span>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    disabled={selectedIds.size === 0 || saving}
                    className="ml-auto text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Supprimer les sélectionnées
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === payments.length && payments.length > 0}
                            onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                            className="rounded"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          N°
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Date échéance
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          HT
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Taxe
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          TTC
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          RCD
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          PJ
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Frais
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Reprise
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Début période
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Fin période
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((p, index) => (
                        <tr key={p.id} className="bg-white hover:bg-gray-50">
                          <td className="px-2 py-1">
                            {p.id && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(p.id)}
                                onChange={() => toggleSelect(p.id as string)}
                                className="rounded"
                              />
                            )}
                          </td>
                          <td className="px-3 py-1 text-sm text-gray-700">
                            {p.installmentNumber}
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="date"
                              value={p.dueDate ? toInputDate(p.dueDate) : ""}
                              onChange={(e) =>
                                updatePayment(index, "dueDate", e.target.value)
                              }
                              className="w-36 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={p.amountHT ?? ""}
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "amountHT",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : 0,
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={p.taxAmount ?? ""}
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "taxAmount",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : 0,
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={p.amountTTC ?? ""}
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "amountTTC",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : 0,
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={p.rcdAmount ?? ""}
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "rcdAmount",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={p.pjAmount ?? ""}
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "pjAmount",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={p.feesAmount ?? ""}
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "feesAmount",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={p.resumeAmount ?? ""}
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "resumeAmount",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                )
                              }
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="date"
                              value={
                                p.periodStart ? toInputDate(p.periodStart) : ""
                              }
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "periodStart",
                                  e.target.value,
                                )
                              }
                              className="w-36 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-1">
                            <input
                              type="date"
                              value={
                                p.periodEnd ? toInputDate(p.periodEnd) : ""
                              }
                              onChange={(e) =>
                                updatePayment(
                                  index,
                                  "periodEnd",
                                  e.target.value,
                                )
                              }
                              className="w-36 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td className="px-2 py-2" />
                        <td
                          colSpan={2}
                          className="px-3 py-2 text-sm text-gray-700"
                        >
                          Total
                        </td>
                        <td className="px-3 py-2 text-right text-sm">
                          {totals.totalAmountHT.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm">
                          {totals.totalTaxAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm">
                          {totals.totalAmountTTC.toFixed(2)}
                        </td>
                        <td colSpan={6} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Enregistrement…" : "Enregistrer l'échéancier"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
