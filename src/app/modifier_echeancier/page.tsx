"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Copy, Trash2 } from "lucide-react";
import type { PaymentInstallment, PaymentSchedule } from "@/lib/types";

type QuoteWithSchedule = {
  id: string;
  reference: string;
  status: string;
  createdAt?: string;
  formData?: {
    companyName?: string;
    companyForm?: { companyName?: string };
    siret?: string;
  };
  companyData?: { siret?: string; companyName?: string; [key: string]: unknown };
  product?: { name: string; code: string };
  broker?: { name: string | null; companyName: string | null };
  paymentSchedule?: PaymentSchedule | null;
  contract?: { id: string; reference: string; status: string } | null;
};

/** Chaîne unique pour la méga-recherche (SIRET, nom, référence, courtier, etc.) */
function getQuoteSearchableText(q: QuoteWithSchedule): string {
  const parts = [
    q.reference ?? "",
    getQuoteSiret(q),
    getQuoteCompanyName(q),
    (q.companyData as { companyName?: string } | undefined)?.companyName ?? "",
    q.broker?.name ?? "",
    q.broker?.companyName ?? "",
    q.status ?? "",
    q.product?.name ?? "",
    q.product?.code ?? "",
    q.contract?.reference ?? "",
  ];
  try {
    if (q.formData && typeof q.formData === "object")
      parts.push(JSON.stringify(q.formData));
    if (q.companyData && typeof q.companyData === "object")
      parts.push(JSON.stringify(q.companyData));
  } catch {
    // ignore
  }
  return parts.join(" ").toLowerCase();
}

function getQuoteSiret(q: QuoteWithSchedule): string {
  const raw = (q.formData as { siret?: string } | undefined)?.siret ?? q.companyData?.siret;
  if (raw != null && String(raw).trim() !== "") return String(raw).trim();
  return "";
}

function getQuoteCompanyName(q: QuoteWithSchedule): string {
  return q.formData?.companyName ?? q.formData?.companyForm?.companyName ?? "";
}

function formatCreatedAt(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

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
  const [activeTab, setActiveTab] = useState<"echeancier" | "doublons" | "doublonsNom" | "recherche">("echeancier");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [megaSearchQuery, setMegaSearchQuery] = useState("");
  const [allQuotesForSearch, setAllQuotesForSearch] = useState<QuoteWithSchedule[]>([]);
  const [megaSearchLoading, setMegaSearchLoading] = useState(false);

  const copyCompanyName = (text: string, id: string) => {
    const name = text.trim();
    if (!name) return;
    navigator.clipboard.writeText(name).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const copyReference = (ref: string, id: string) => {
    if (!ref?.trim()) return;
    navigator.clipboard.writeText(ref.trim()).then(() => {
      setCopiedId(`ref-${id}`);
      window.setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleDeleteQuote = async (id: string) => {
    if (!window.confirm("Supprimer ce devis ? Cette action est irréversible.")) return;
    setDeletingQuoteId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data?.error ?? "Impossible de supprimer le devis." });
        return;
      }
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setAllQuotesForSearch((prev) => prev.filter((q) => q.id !== id));
      if (selectedQuoteId === id) {
        const remaining = quotes.filter((q) => q.id !== id);
        setSelectedQuoteId(remaining[0]?.id ?? "");
      }
      setMessage({ type: "ok", text: "Devis supprimé." });
    } finally {
      setDeletingQuoteId(null);
    }
  };

  useEffect(() => {
    if (!session && !isPending) router.push("/login");
  }, [session, isPending, router]);

  // Charger tous les devis du système (toutes les pages)
  useEffect(() => {
    if (!session) return;
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const allQuotes: QuoteWithSchedule[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await fetch(`/api/quotes?limit=100&page=${page}`);
          const data = await res.json();
          const quotesPage = data?.data?.quotes ?? [];
          const pagination = data?.data?.pagination;
          totalPages = pagination?.totalPages ?? 1;
          allQuotes.push(...(quotesPage as QuoteWithSchedule[]));
          page++;
        } while (page <= totalPages && allQuotes.length > 0);
        const rcdQuotes = allQuotes.filter((q: QuoteWithSchedule) =>
          (q.reference || "").toUpperCase().startsWith("RCD")
        );
        setQuotes(rcdQuotes);
        const currentInList = selectedQuoteId && rcdQuotes.some((q: QuoteWithSchedule) => q.id === selectedQuoteId);
        if (rcdQuotes.length > 0 && (!selectedQuoteId || !currentInList)) {
          setSelectedQuoteId(rcdQuotes[0].id);
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

  /** Groupes de devis partageant le même SIRET (uniquement les doublons, nb > 1) */
  const duplicateGroupsBySiret = useMemo(() => {
    const bySiret = new Map<string, QuoteWithSchedule[]>();
    for (const q of quotes) {
      const siret = getQuoteSiret(q);
      const key = siret || "__sans_siret__";
      if (!bySiret.has(key)) bySiret.set(key, []);
      bySiret.get(key)!.push(q);
    }
    const duplicates: { siret: string; quotes: QuoteWithSchedule[] }[] = [];
    bySiret.forEach((quoteList, key) => {
      if (quoteList.length > 1)
        duplicates.push({
          siret: key === "__sans_siret__" ? "(sans SIRET)" : key,
          quotes: quoteList,
        });
    });
    return duplicates.sort((a, b) => a.siret.localeCompare(b.siret));
  }, [quotes]);

  /** Groupes de devis partageant le même nom d'entreprise (normalisé, nb > 1) */
  const duplicateGroupsByCompanyName = useMemo(() => {
    const byName = new Map<string, QuoteWithSchedule[]>();
    for (const q of quotes) {
      const raw = getQuoteCompanyName(q).trim();
      const key = raw.toLowerCase();
      if (!key) continue; // ignorer les devis sans nom
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(q);
    }
    const duplicates: { companyName: string; quotes: QuoteWithSchedule[] }[] = [];
    byName.forEach((quoteList, normalizedKey) => {
      if (quoteList.length > 1) {
        const displayName = quoteList[0] ? getQuoteCompanyName(quoteList[0]).trim() || normalizedKey : normalizedKey;
        duplicates.push({ companyName: displayName, quotes: quoteList });
      }
    });
    return duplicates.sort((a, b) => a.companyName.localeCompare(b.companyName, "fr"));
  }, [quotes]);

  // Charger TOUS les devis (sans filtre RCD) quand on ouvre l'onglet Recherche
  useEffect(() => {
    if (!session || activeTab !== "recherche" || allQuotesForSearch.length > 0) return;
    const fetchAllForSearch = async () => {
      setMegaSearchLoading(true);
      try {
        const list: QuoteWithSchedule[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await fetch(`/api/quotes?limit=100&page=${page}`);
          const data = await res.json();
          const quotesPage = data?.data?.quotes ?? [];
          const pagination = data?.data?.pagination;
          totalPages = pagination?.totalPages ?? 1;
          list.push(...(quotesPage as QuoteWithSchedule[]));
          page++;
        } while (page <= totalPages && list.length > 0);
        setAllQuotesForSearch(list);
      } finally {
        setMegaSearchLoading(false);
      }
    };
    fetchAllForSearch();
  }, [session, activeTab, allQuotesForSearch.length]);

  /** Résultats de la méga-recherche (tous les devis, filtrés par la requête) */
  const megaSearchResults = useMemo(() => {
    const q = megaSearchQuery.trim().toLowerCase();
    if (!q) return allQuotesForSearch;
    return allQuotesForSearch.filter((quote) =>
      getQuoteSearchableText(quote).includes(q)
    );
  }, [allQuotesForSearch, megaSearchQuery]);

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
            <div className="flex gap-2 mb-4 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("echeancier")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px ${
                  activeTab === "echeancier"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Échéancier
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("doublons")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px ${
                  activeTab === "doublons"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Doublons SIRET
                {duplicateGroupsBySiret.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                    {duplicateGroupsBySiret.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("doublonsNom")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px ${
                  activeTab === "doublonsNom"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Doublons nom
                {duplicateGroupsByCompanyName.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                    {duplicateGroupsByCompanyName.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recherche")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px ${
                  activeTab === "recherche"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Recherche
              </button>
            </div>

            {activeTab === "doublons" ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 bg-gray-100 border-b">
                  <h2 className="text-sm font-medium text-gray-700">
                    Dossiers avec le même SIRET ({duplicateGroupsBySiret.length} groupe(s))
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Cliquez sur un devis pour l’ouvrir dans l’onglet Échéancier.
                  </p>
                </div>
                <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
                  {duplicateGroupsBySiret.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      Aucun doublon de SIRET parmi les devis chargés.
                    </div>
                  ) : (
                    duplicateGroupsBySiret.map(({ siret, quotes: groupQuotes }) => (
                      <div key={siret} className="p-4">
                        <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <span className="text-blue-600">SIRET : {siret}</span>
                          <span className="text-xs font-normal text-gray-500">
                            {groupQuotes.length} devis
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {groupQuotes.map((q) => {
                            const companyName = getQuoteCompanyName(q) || "—";
                            return (
                            <li key={q.id}>
                              <div className="flex items-center gap-2 w-full px-3 py-2 rounded-md border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm group">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedQuoteId(q.id);
                                    setActiveTab("echeancier");
                                  }}
                                  className="text-left flex-1 flex flex-wrap items-center gap-2 min-w-0"
                                >
                                  <span className="font-mono text-gray-700">{q.reference}</span>
                                  <span className="text-gray-600 truncate">
                                    {companyName}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                                    {q.status}
                                  </span>
                                  <span className="text-xs text-gray-500 shrink-0" title="Créé le">
                                    {formatCreatedAt(q.createdAt)}
                                  </span>
                                  {q.contract && (
                                    <span className="text-xs text-gray-500 shrink-0">
                                      Contrat : {q.contract.reference}
                                    </span>
                                  )}
                                </button>
                                {companyName !== "—" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyCompanyName(companyName, q.id);
                                    }}
                                    className="p-1.5 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 shrink-0"
                                    title="Copier le nom de l'entreprise"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                )}
                                {copiedId === q.id && <span className="text-xs text-green-600 shrink-0">Copié !</span>}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteQuote(q.id); }}
                                  disabled={deletingQuoteId === q.id}
                                  className="p-1.5 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 shrink-0 disabled:opacity-50"
                                  title="Supprimer le devis"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </li>
                          ); })}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === "doublonsNom" ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 bg-gray-100 border-b">
                  <h2 className="text-sm font-medium text-gray-700">
                    Dossiers avec le même nom d'entreprise ({duplicateGroupsByCompanyName.length} groupe(s))
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Regroupement insensible à la casse. Cliquez sur un devis pour l'ouvrir dans l'onglet Échéancier.
                  </p>
                </div>
                <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
                  {duplicateGroupsByCompanyName.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      Aucun doublon de nom d'entreprise parmi les devis chargés.
                    </div>
                  ) : (
                    duplicateGroupsByCompanyName.map(({ companyName, quotes: groupQuotes }) => (
                      <div key={companyName} className="p-4">
                        <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <span className="text-blue-600">{companyName}</span>
                          <span className="text-xs font-normal text-gray-500">
                            {groupQuotes.length} devis
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {groupQuotes.map((q) => {
                            const name = getQuoteCompanyName(q) || "—";
                            return (
                              <li key={q.id}>
                                <div className="flex items-center gap-2 w-full px-3 py-2 rounded-md border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm group">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedQuoteId(q.id);
                                      setActiveTab("echeancier");
                                    }}
                                    className="text-left flex-1 flex flex-wrap items-center gap-2 min-w-0"
                                  >
                                    <span className="font-mono text-gray-700">{q.reference}</span>
                                    <span className="text-gray-600 truncate">{name}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                                      {q.status}
                                    </span>
                                    <span className="text-xs text-gray-500 shrink-0" title="Créé le">
                                      {formatCreatedAt(q.createdAt)}
                                    </span>
                                    {getQuoteSiret(q) && (
                                      <span className="text-xs text-gray-500 shrink-0">
                                        SIRET : {getQuoteSiret(q)}
                                      </span>
                                    )}
                                    {q.contract && (
                                      <span className="text-xs text-gray-500 shrink-0">
                                        Contrat : {q.contract.reference}
                                      </span>
                                    )}
                                  </button>
                                  {name !== "—" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyCompanyName(name, q.id);
                                      }}
                                      className="p-1.5 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 shrink-0"
                                      title="Copier le nom de l'entreprise"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                  )}
                                  {copiedId === q.id && <span className="text-xs text-green-600 shrink-0">Copié !</span>}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteQuote(q.id); }}
                                    disabled={deletingQuoteId === q.id}
                                    className="p-1.5 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 shrink-0 disabled:opacity-50"
                                    title="Supprimer le devis"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === "recherche" ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-4 bg-gray-100 border-b">
                  <h2 className="text-sm font-medium text-gray-700 mb-2">
                    Recherche dans tous les devis
                  </h2>
                  <p className="text-xs text-gray-500 mb-3">
                    SIRET, nom d'entreprise, nom du client, référence, courtier, statut, produit…
                  </p>
                  <input
                    type="search"
                    placeholder="Rechercher (SIRET, société, client, référence…)"
                    value={megaSearchQuery}
                    onChange={(e) => setMegaSearchQuery(e.target.value)}
                    className="w-full max-w-2xl px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus={activeTab === "recherche"}
                  />
                  {megaSearchLoading && (
                    <p className="text-sm text-gray-500 mt-2">Chargement de tous les devis…</p>
                  )}
                  {!megaSearchLoading && (
                    <p className="text-sm text-gray-600 mt-2">
                      {megaSearchQuery.trim() ? `${megaSearchResults.length} résultat(s)` : `${allQuotesForSearch.length} devis chargés`}
                    </p>
                  )}
                </div>
                <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
                  {megaSearchLoading ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      Chargement…
                    </div>
                  ) : megaSearchResults.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      {allQuotesForSearch.length === 0
                        ? "Aucun devis."
                        : "Aucun résultat pour cette recherche."}
                    </div>
                  ) : (
                    megaSearchResults.map((q) => {
                      const companyName = getQuoteCompanyName(q) || (q.companyData as { companyName?: string } | undefined)?.companyName || "—";
                      return (
                        <div key={q.id} className="flex items-center gap-2 w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuoteId(q.id);
                              setQuotes((prev) =>
                                prev.some((qu) => qu.id === q.id) ? prev : [q, ...prev]
                              );
                              setActiveTab("echeancier");
                            }}
                            className="text-left flex-1 flex flex-wrap items-center gap-2 min-w-0"
                          >
                            <span className="font-mono text-gray-700 font-medium">{q.reference}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyReference(q.reference ?? "", q.id); }}
                              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 shrink-0"
                              title="Copier la référence"
                            >
                              COPIER REFERENCE
                            </button>
                            {copiedId === `ref-${q.id}` && <span className="text-xs text-green-600 shrink-0">Copié !</span>}
                            <span className="text-gray-600 truncate">{companyName}</span>
                            {getQuoteSiret(q) && (
                              <span className="text-xs text-gray-500 font-mono">{getQuoteSiret(q)}</span>
                            )}
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                              {q.status}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {formatCreatedAt(q.createdAt)}
                            </span>
                            {q.broker?.companyName && (
                              <span className="text-xs text-gray-400 shrink-0">{q.broker.companyName}</span>
                            )}
                            {q.contract && (
                              <span className="text-xs text-gray-500 shrink-0">Contrat : {q.contract.reference}</span>
                            )}
                          </button>
                          {companyName !== "—" && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyCompanyName(companyName, q.id); }}
                              className="p-1.5 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 shrink-0"
                              title="Copier le nom"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {copiedId === q.id && <span className="text-xs text-green-600 shrink-0">Copié !</span>}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuote(q.id); }}
                            disabled={deletingQuoteId === q.id}
                            className="p-1.5 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 shrink-0 disabled:opacity-50"
                            title="Supprimer le devis"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
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
                {selectedQuote && (
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 truncate max-w-[200px]" title={getQuoteCompanyName(selectedQuote)}>
                      {getQuoteCompanyName(selectedQuote) || "—"}
                    </span>
                    {getQuoteSiret(selectedQuote) && (
                      <span className="text-lg font-semibold text-gray-700 font-mono" title="SIRET">
                        {getQuoteSiret(selectedQuote)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500" title="Créé le">
                      {formatCreatedAt(selectedQuote.createdAt)}
                    </span>
                    {getQuoteCompanyName(selectedQuote) && (
                      <button
                        type="button"
                        onClick={() => copyCompanyName(getQuoteCompanyName(selectedQuote!), "selected")}
                        className="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        title="Copier le nom de l'entreprise"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {copiedId === "selected" && <span className="text-xs text-green-600">Copié !</span>}
                    <button
                      type="button"
                      onClick={() => selectedQuote && handleDeleteQuote(selectedQuote.id)}
                      disabled={deletingQuoteId === selectedQuote?.id}
                      className="p-1.5 rounded text-gray-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                      title="Supprimer le devis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
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
          </>
        )}
      </main>
    </div>
  );
}
