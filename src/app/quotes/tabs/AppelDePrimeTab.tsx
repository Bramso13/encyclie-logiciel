"use client";

import { CalculationResult, Quote } from "@/lib/types";
import { pdf } from "@react-pdf/renderer";
import { useState, useEffect, useCallback } from "react";
import PremiumCallPDF from "@/components/pdf/PremiumCallPDF";
import { getBrokerInfo } from "@/lib/utils";
import {
  CheckCircle2,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Download,
  Mail,
  Calendar,
  X,
  Clock,
  Euro,
  FileText,
  ChevronRight,
} from "lucide-react";

// ─── Types locaux ────────────────────────────────────────────────────────────

interface LocalInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  amountHT: number;
  taxAmount: number;
  amountTTC: number;
  rcdAmount: number | null;
  pjAmount: number | null;
  feesAmount: number | null;
  resumeAmount: number | null;
  status: string;
  paidAt: string | null;
  emissionDate: string | null;
  paymentMethod: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-gray-100 text-gray-600" },
  OVERDUE: { label: "En retard", color: "bg-red-100 text-red-700" },
  PAID: { label: "Payée", color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-600" },
};

const QUOTE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  SUBMITTED: { label: "Soumis", color: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "Accepté", color: "bg-emerald-100 text-emerald-700" },
  PRIME_CALL_EMITTED: { label: "Appel de prime émis", color: "bg-amber-100 text-amber-700" },
  INSTALLMENT_IN_PROGRESS: { label: "Échéance en cours", color: "bg-indigo-100 text-indigo-700" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-100 text-blue-700" },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  CHECK: "Chèque",
  BANK_TRANSFER: "Virement",
  CARD: "Carte bancaire",
  SEPA_DEBIT: "Prélèvement SEPA",
  OTHER: "Autre",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR");
  } catch {
    return d;
  }
}

function fmtEuro(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " €";
}

/** Construit un echeancier "simulé" pour le PDF à partir d'une seule échéance */
function buildSingleInstallmentCalcResult(
  inst: LocalInstallment,
  baseCalcResult: CalculationResult | null
): CalculationResult | null {
  if (!baseCalcResult) return null;

  const echeance = {
    date: inst.dueDate ? new Date(inst.dueDate).toLocaleDateString("fr-FR") : "—",
    totalHT: inst.amountHT,
    taxe: inst.taxAmount,
    totalTTC: inst.amountTTC,
    rcd: inst.rcdAmount ?? 0,
    pj: inst.pjAmount ?? 0,
    frais: inst.feesAmount ?? 0,
    reprise: inst.resumeAmount ?? 0,
    debutPeriode: inst.periodStart ? new Date(inst.periodStart).toLocaleDateString("fr-FR") : "—",
    finPeriode: inst.periodEnd ? new Date(inst.periodEnd).toLocaleDateString("fr-FR") : "—",
  };

  return {
    ...baseCalcResult,
    primeTotal: inst.amountHT,
    totalTTC: inst.amountTTC,
    autres: {
      ...((baseCalcResult as any).autres ?? {}),
      taxeAssurance: inst.taxAmount,
    },
    echeancier: {
      ...((baseCalcResult as any).echeancier ?? {}),
      echeances: [echeance],
    },
  } as CalculationResult;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function AppelDePrimeTab({
  quote,
  calculationResult,
  session,
}: {
  quote: Quote;
  calculationResult: CalculationResult | null;
  session: any;
}) {
  const [installments, setInstallments] = useState<LocalInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // PDF state par installment
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});

  // Actions
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal : Valider la prochaine échéance
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validateInstallmentId, setValidateInstallmentId] = useState<string>("");
  const [validateEmissionDate, setValidateEmissionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [validating, setValidating] = useState(false);

  // Modal : Règlement reçu
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInstallmentId, setPaymentInstallmentId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [paying, setPaying] = useState(false);

  // ── Fetch schedule ──────────────────────────────────────────────────────
  const fetchInstallments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/payment-schedule`);
      if (!res.ok) return;
      const raw = await res.json();
      const sched = raw.data ?? raw;
      if (sched?.payments) {
        const sorted: LocalInstallment[] = sched.payments
          .map((p: any) => ({
            id: p.id,
            installmentNumber: p.installmentNumber,
            dueDate: p.dueDate ?? null,
            periodStart: p.periodStart ?? null,
            periodEnd: p.periodEnd ?? null,
            amountHT: p.amountHT ?? 0,
            taxAmount: p.taxAmount ?? 0,
            amountTTC: p.amountTTC ?? 0,
            rcdAmount: p.rcdAmount ?? null,
            pjAmount: p.pjAmount ?? null,
            feesAmount: p.feesAmount ?? null,
            resumeAmount: p.resumeAmount ?? null,
            status: p.status ?? "PENDING",
            paidAt: p.paidAt ?? null,
            emissionDate: p.emissionDate ?? null,
            paymentMethod: p.paymentMethod ?? null,
          }))
          .sort((a: LocalInstallment, b: LocalInstallment) => a.installmentNumber - b.installmentNumber);
        setInstallments(sorted);
        if (sorted.length > 0 && !activeTab) {
          setActiveTab(sorted[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [quote.id]);

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  // ── Génération PDF par installment ──────────────────────────────────────
  const loadPdfForInstallment = useCallback(
    async (inst: LocalInstallment) => {
      if (pdfUrls[inst.id] || pdfLoading[inst.id]) return;
      setPdfLoading((prev) => ({ ...prev, [inst.id]: true }));
      try {
        const singleCalcResult = buildSingleInstallmentCalcResult(inst, calculationResult);
        const res = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "premium-call",
            quote,
            calculationResult: singleCalcResult,
          }),
        });
        if (!res.ok) throw new Error("Erreur PDF");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrls((prev) => ({ ...prev, [inst.id]: url }));
      } catch {
        // silencieux
      } finally {
        setPdfLoading((prev) => ({ ...prev, [inst.id]: false }));
      }
    },
    [calculationResult, quote, pdfUrls, pdfLoading]
  );

  // Charger le PDF dès qu'un onglet devient actif
  useEffect(() => {
    if (!activeTab) return;
    const inst = installments.find((i) => i.id === activeTab);
    if (inst) loadPdfForInstallment(inst);
  }, [activeTab, installments]);

  // ── Helpers pour les modales ─────────────────────────────────────────────

  /** Prochaine échéance sans emissionDate (ordre chronologique) */
  const nextUnvalidatedInstallment = installments.find(
    (i) => !i.emissionDate && i.status !== "PAID" && i.status !== "CANCELLED"
  );

  /** Échéances candidates pour règlement : ont une emissionDate et ne sont pas payées */
  const payableInstallments = installments.filter(
    (i) => i.emissionDate && i.status !== "PAID" && i.status !== "CANCELLED"
  );

  const openValidateModal = () => {
    if (!nextUnvalidatedInstallment) return;
    setValidateInstallmentId(nextUnvalidatedInstallment.id);
    setValidateEmissionDate(new Date().toISOString().split("T")[0]);
    setShowValidateModal(true);
  };

  const openPaymentModal = () => {
    const first = payableInstallments[0];
    setPaymentInstallmentId(first?.id ?? "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("BANK_TRANSFER");
    setShowPaymentModal(true);
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (!validateInstallmentId || !validateEmissionDate) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/validate-installment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: validateInstallmentId,
          emissionDate: validateEmissionDate,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message ?? "Erreur");
      }
      setShowValidateModal(false);
      setActionMsg({ type: "success", text: "Appel de prime émis — statut du devis mis à jour" });
      setTimeout(() => setActionMsg(null), 5000);
      // Invalider les PDF générés pour forcer la re-génération
      setPdfUrls({});
      await fetchInstallments();
    } catch (err) {
      setActionMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setValidating(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentInstallmentId || !paymentDate) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/payment-received`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: paymentInstallmentId,
          paidAt: paymentDate,
          paymentMethod,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message ?? "Erreur");
      }
      setShowPaymentModal(false);
      setActionMsg({ type: "success", text: "Règlement enregistré — échéance marquée comme payée" });
      setTimeout(() => setActionMsg(null), 5000);
      setPdfUrls({});
      await fetchInstallments();
    } catch (err) {
      setActionMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPdf = async (inst: LocalInstallment) => {
    try {
      const singleCalcResult = buildSingleInstallmentCalcResult(inst, calculationResult);
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "premium-call", quote, calculationResult: singleCalcResult }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appel-prime-${quote.reference || "devis"}-echeance${inst.installmentNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setActionMsg({ type: "error", text: "Erreur lors du téléchargement" });
    }
  };

  const handleSendEmail = async (inst: LocalInstallment) => {
    try {
      const brokerInfo = await getBrokerInfo(session?.user?.id);
      const singleCalcResult = buildSingleInstallmentCalcResult(inst, calculationResult);
      const pdfBlob = await pdf(
        <PremiumCallPDF
          quote={quote}
          calculationResult={singleCalcResult}
          baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
        />
      ).toBlob();

      const formData = new FormData();
      formData.append("quoteId", quote.id);
      formData.append("companyName", quote.formData?.companyName || quote.companyData?.companyName || "");
      formData.append("clientEmail", session?.user?.email || "");
      formData.append("pdf", pdfBlob, `appel-prime-${quote.reference || "devis"}-echeance${inst.installmentNumber}.pdf`);

      const res = await fetch("/api/email/send-premium-call", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erreur lors de l'envoi");

      setActionMsg({ type: "success", text: `Appel de prime n°${inst.installmentNumber} envoyé par email` });
      setTimeout(() => setActionMsg(null), 5000);
    } catch (err) {
      setActionMsg({ type: "error", text: "Erreur lors de l'envoi de l'email" });
    }
  };

  // ── Statut quote ─────────────────────────────────────────────────────────
  const quoteStatusInfo = QUOTE_STATUS_LABELS[quote.status] ?? { label: quote.status, color: "bg-gray-100 text-gray-600" };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
        <span className="text-gray-500">Chargement…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appel de prime</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Document d'appel de prime et suivi des règlements
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Badge statut devis */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${quoteStatusInfo.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {quoteStatusInfo.label}
          </span>

          {/* Bouton Valider la prochaine échéance */}
          <button
            onClick={openValidateModal}
            disabled={!nextUnvalidatedInstallment}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            title={!nextUnvalidatedInstallment ? "Toutes les échéances ont une date d'émission" : `Valider l'échéance n°${nextUnvalidatedInstallment.installmentNumber}`}
          >
            <FileText className="w-4 h-4" />
            Valider la prochaine échéance
            {nextUnvalidatedInstallment && (
              <span className="bg-amber-400 px-1.5 py-0.5 rounded text-xs font-bold">
                n°{nextUnvalidatedInstallment.installmentNumber}
              </span>
            )}
          </button>

          {/* Bouton Règlement reçu */}
          <button
            onClick={openPaymentModal}
            disabled={payableInstallments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            title={payableInstallments.length === 0 ? "Aucune échéance avec appel de prime émis" : undefined}
          >
            <CreditCard className="w-4 h-4" />
            Règlement reçu
            {payableInstallments.length > 0 && (
              <span className="bg-emerald-500 px-1.5 py-0.5 rounded text-xs font-bold">
                {payableInstallments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Message d'action ────────────────────────────────────────────── */}
      {actionMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          actionMsg.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {actionMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Pas d'échéancier ────────────────────────────────────────────── */}
      {installments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun échéancier</p>
          <p className="text-sm text-gray-400 mt-1">
            Créez un échéancier dans l'onglet Bordereau pour gérer les appels de prime.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* ── Onglets par échéance ─────────────────────────────────────── */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {installments.map((inst) => {
              const isActive = activeTab === inst.id;
              const statusInfo = STATUS_LABELS[inst.status] ?? { label: inst.status, color: "bg-gray-100 text-gray-600" };
              const hasEmission = !!inst.emissionDate;
              return (
                <button
                  key={inst.id}
                  onClick={() => setActiveTab(inst.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {inst.status === "PAID" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : hasEmission ? (
                    <FileText className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  Échéance {inst.installmentNumber}
                  <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Contenu de l'onglet actif ─────────────────────────────────── */}
          {installments.map((inst) => {
            if (activeTab !== inst.id) return null;
            const pdfUrl = pdfUrls[inst.id];
            const isPdfLoading = pdfLoading[inst.id];
            const statusInfo = STATUS_LABELS[inst.status] ?? { label: inst.status, color: "bg-gray-100 text-gray-600" };

            return (
              <div key={inst.id} className="flex flex-col">
                {/* ── Fiche de l'échéance ──────────────────────────────────── */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-lg">
                        {inst.installmentNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            Échéance n°{inst.installmentNumber}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          Période : {fmtDate(inst.periodStart)} → {fmtDate(inst.periodEnd)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadPdf(inst)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger PDF
                      </button>
                      <button
                        onClick={() => handleSendEmail(inst)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Envoyer par email
                      </button>
                    </div>
                  </div>

                  {/* Détails financiers et dates */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Prime HT</div>
                      <div className="font-semibold text-gray-900">{fmtEuro(inst.amountHT)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Taxes</div>
                      <div className="font-semibold text-gray-900">{fmtEuro(inst.taxAmount)}</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="text-xs text-indigo-600 mb-1 font-medium">Prime TTC</div>
                      <div className="font-bold text-indigo-700 text-lg">{fmtEuro(inst.amountTTC)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Date d'échéance</div>
                      <div className="font-semibold text-gray-900">{fmtDate(inst.dueDate)}</div>
                    </div>
                  </div>

                  {/* Bloc émission / règlement */}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      inst.emissionDate ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-dashed border-gray-200"
                    }`}>
                      <FileText className={`w-4 h-4 ${inst.emissionDate ? "text-amber-600" : "text-gray-300"}`} />
                      <span className="text-gray-600">Date émission :</span>
                      <span className={`font-medium ${inst.emissionDate ? "text-amber-700" : "text-gray-400 italic"}`}>
                        {inst.emissionDate ? fmtDate(inst.emissionDate) : "Non définie"}
                      </span>
                      {!inst.emissionDate && nextUnvalidatedInstallment?.id === inst.id && (
                        <button
                          onClick={openValidateModal}
                          className="ml-1 text-xs text-amber-600 underline hover:text-amber-800"
                        >
                          Valider
                        </button>
                      )}
                    </div>

                    {inst.paidAt && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-gray-600">Réglée le :</span>
                        <span className="font-medium text-emerald-700">{fmtDate(inst.paidAt)}</span>
                        {inst.paymentMethod && (
                          <span className="text-gray-400">·</span>
                        )}
                        {inst.paymentMethod && (
                          <span className="text-gray-600">{PAYMENT_METHOD_LABELS[inst.paymentMethod] ?? inst.paymentMethod}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Aperçu PDF ───────────────────────────────────────────── */}
                <div>
                  {isPdfLoading ? (
                    <div className="flex items-center justify-center py-24 bg-gray-50">
                      <div className="flex flex-col items-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                        <span className="text-gray-500 text-sm">Génération du document…</span>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full"
                      style={{ height: "calc(100vh - 400px)", minHeight: "700px" }}
                      title={`Appel de prime — Échéance ${inst.installmentNumber}`}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-24 bg-gray-50">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2">Document non disponible</p>
                        <p className="text-sm text-gray-400">
                          {!calculationResult
                            ? "Le calcul de prime est requis"
                            : "Erreur lors du chargement"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Modale : Valider la prochaine échéance
      ══════════════════════════════════════════════════════════════════ */}
      {showValidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Valider la prochaine échéance
                </h3>
              </div>
              <button onClick={() => setShowValidateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              <strong>Action :</strong> définit la date d'émission de l'appel de prime pour l'échéance sélectionnée et passe le devis en statut{" "}
              <span className="font-mono bg-amber-100 px-1 rounded">APPEL DE PRIME ÉMIS</span>.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Échéance à valider <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={validateInstallmentId}
                  onChange={(e) => setValidateInstallmentId(e.target.value)}
                >
                  {installments
                    .filter((i) => !i.emissionDate && i.status !== "PAID" && i.status !== "CANCELLED")
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        Échéance n°{i.installmentNumber} — {fmtDate(i.dueDate)} — {fmtEuro(i.amountTTC)}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Seules les échéances sans date d'émission sont listées.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'émission de l'appel de prime <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={validateEmissionDate}
                  onChange={(e) => setValidateEmissionDate(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Cette date sera utilisée comme <span className="font-mono">DATE_ETAT_POLICE</span> dans le bordereau.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowValidateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleValidate}
                disabled={!validateInstallmentId || !validateEmissionDate || validating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {validating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Valider l'appel de prime
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Modale : Règlement reçu
      ══════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Enregistrer un règlement
                </h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-800">
              <strong>Action :</strong> marque l'échéance comme <strong>PAYÉE</strong> et passe le devis en statut{" "}
              <span className="font-mono bg-emerald-100 px-1 rounded">ÉCHÉANCE EN COURS</span>.
            </div>

            {payableInstallments.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                Aucune échéance avec appel de prime émis trouvée.<br />
                Validez d'abord une échéance avec le bouton « Valider la prochaine échéance ».
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Échéance réglée <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={paymentInstallmentId}
                    onChange={(e) => setPaymentInstallmentId(e.target.value)}
                  >
                    {payableInstallments.map((i) => (
                      <option key={i.id} value={i.id}>
                        Échéance n°{i.installmentNumber} — émission : {fmtDate(i.emissionDate)} — {fmtEuro(i.amountTTC)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de règlement <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode de paiement
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              {payableInstallments.length > 0 && (
                <button
                  onClick={handlePayment}
                  disabled={!paymentInstallmentId || !paymentDate || paying}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Enregistrer le règlement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
