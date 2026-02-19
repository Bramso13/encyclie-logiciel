"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Save,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Ban,
  Undo2,
  X,
} from "lucide-react";
import { tableauTax, getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import { Quote, CalculationResult } from "@/lib/types";

// ─── Local types (no Prisma imports) ────────────────────────────────────────

interface LocalInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  amountHT: number;
  taxAmount: number;
  amountTTC: number;
  rcdAmount: number | null;
  pjAmount: number | null;
  feesAmount: number | null;
  resumeAmount: number | null;
  status: string;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  emissionDate: string | null;
}

interface ContractData {
  id: string;
  reference: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface PolicesRow {
  APPORTEUR: string;
  IDENTIFIANT_POLICE: string;
  DATE_SOUSCRIPTION: string;
  DATE_EFFET_CONTRAT: string;
  DATE_FIN_CONTRAT: string;
  NUMERO_AVENANT: string;
  MOTIF_AVENANT: string;
  DATE_EFFET_AVENANT: string;
  DATE_ECHEANCE: string;
  ETAT_POLICE: string;
  DATE_ETAT_POLICE: string;
  MOTIF_ETAT: string;
  MOTIF_STATUT: string;
  FRACTIONNEMENT: string;
  NOM_ENTREPRISE_ASSURE: string;
  SIREN: string;
  ADRESSE_RISQUE: string;
  VILLE_RISQUE: string;
  CODE_POSTAL_RISQUE: string;
  CA_ENTREPRISE: string;
  EFFECTIF_ENTREPRISE: string;
  CODE_NAF: string;
  [key: string]: string;
}

interface QuittancesRow {
  APPORTEUR: string;
  IDENTIFIANT_POLICE: string;
  NUMERO_AVENANT: string;
  IDENTIFIANT_QUITTANCE: string;
  DATE_EFFET_QUITTANCE: string;
  DATE_FIN_QUITTANCE: string;
  DATE_ENCAISSEMENT: string;
  STATUT_QUITTANCE: string;
  GARANTIE: string;
  PRIME_TTC: string;
  PRIME_HT: string;
  TAXES: string;
  TAXE_POURCENTAGE: string;
  COMMISSIONS: string;
  MODE_PAIEMENT: string;
}

// ─── Mapping constants ───────────────────────────────────────────────────────

const APPORTEUR_CODE = "2518107500";

const activiteMap = new Map(tableauTax.map((t) => [t.code, t.title]));

const STATUS_POLICE: Record<string, string> = {
  DRAFT: "BROUILLON",
  INCOMPLETE: "INCOMPLET",
  SUBMITTED: "SOUSCRIPTION",
  IN_PROGRESS: "EN COURS",
  COMPLEMENT_REQUIRED: "COMPLEMENT REQUIS",
  OFFER_READY: "OFFRE PRETE",
  OFFER_SENT: "OFFRE ENVOYEE",
  ACCEPTED: "ACCEPTE",
  REJECTED: "REJETE",
  EXPIRED: "EXPIRE",
};

const CONTRACT_STATUS: Record<string, string> = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDU",
  EXPIRED: "EXPIRE",
  CANCELLED: "RESILIE",
  PENDING_RENEWAL: "EN ATTENTE DE RENOUVELLEMENT",
};

const QUITTANCE_STATUS: Record<string, string> = {
  PENDING: "EMISE",
  PAID: "ENCAISSE",
  OVERDUE: "EMISE",
  CANCELLED: "ANNULE",
  PARTIALLY_PAID: "PARTIEL",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "ESPECES",
  CHECK: "CHEQUE",
  BANK_TRANSFER: "VIREMENT",
  CARD: "CARTE",
  SEPA_DEBIT: "PRELEVEMENT",
  OTHER: "AUTRE",
};

const INSTALLMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "En attente (EMISE)" },
  { value: "PAID", label: "Payé (ENCAISSE)" },
  { value: "OVERDUE", label: "En retard (EMISE)" },
  { value: "CANCELLED", label: "Annulé (ANNULE)" },
  { value: "PARTIALLY_PAID", label: "Partiel (PARTIEL)" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "—" },
  { value: "CASH", label: "Espèces" },
  { value: "CHECK", label: "Chèque" },
  { value: "BANK_TRANSFER", label: "Virement" },
  { value: "CARD", label: "Carte bancaire" },
  { value: "SEPA_DEBIT", label: "Prélèvement SEPA" },
  { value: "OTHER", label: "Autre" },
];

// ─── Pure helper functions ───────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function toISODateString(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toISOString().split("T")[0];
}

function toStr(v: unknown): string {
  return v != null ? String(v) : "";
}

function getActiviteTitle(code: string | number): string {
  const n = typeof code === "string" ? parseInt(code, 10) : code;
  if (isNaN(n)) return String(code);
  return activiteMap.get(n) ?? String(code);
}

function getQuittanceLetter(periodicity: string): string {
  const s = (periodicity ?? "").toLowerCase().trim();
  if (s.includes("trimestre") || s === "trimestriel") return "Q";
  if (s.includes("mensuel") || s === "mensuel") return "M";
  if (s.includes("semestre") || s === "semestriel") return "S";
  return "";
}

function mapApiInstallment(p: any): LocalInstallment {
  return {
    id: p.id,
    installmentNumber: p.installmentNumber,
    dueDate: toISODateString(p.dueDate),
    periodStart: toISODateString(p.periodStart),
    periodEnd: toISODateString(p.periodEnd),
    amountHT: p.amountHT ?? 0,
    taxAmount: p.taxAmount ?? 0,
    amountTTC: p.amountTTC ?? 0,
    rcdAmount: p.rcdAmount ?? null,
    pjAmount: p.pjAmount ?? null,
    feesAmount: p.feesAmount ?? null,
    resumeAmount: p.resumeAmount ?? null,
    status: p.status ?? "PENDING",
    paidAt: p.paidAt ? toISODateString(p.paidAt) : null,
    paidAmount: p.paidAmount ?? null,
    paymentMethod: p.paymentMethod ?? null,
    emissionDate: p.emissionDate ? toISODateString(p.emissionDate) : null,
  };
}

// ─── Bordereau computation ───────────────────────────────────────────────────

/**
 * Une ligne par échéance dans la Feuille 1 (Polices).
 * Les champs société sont partagés, les champs dates/motif sont propres à chaque échéance.
 */
function computePolicesRows(
  installments: LocalInstallment[],
  fd: Record<string, any>,
  cd: Record<string, any>,
  quoteRef: string,
  quoteStatus: string,
  contract: ContractData | null,
  resiliationDate: string | null,
): PolicesRow[] {
  if (installments.length === 0) return [];

  const dateDeffetRaw =
    fd.dateDeffet ?? fd.dateEffet ?? fd.dateDebut ?? fd.startDate;
  const dateSouscription = dateDeffetRaw ? fmtDate(dateDeffetRaw) : "";

  // DATE_EFFET_CONTRAT = contract.startDate uniquement
  const dateEffet = contract ? fmtDate(contract.startDate) : "";

  const fractionnement = toStr(
    fd.periodicity ?? fd.periodicite ?? fd.fractionnementPrime,
  );
  const siretRaw = fd.siret ?? cd.siret;
  const siren = siretRaw ? String(siretRaw).replace(/\D/g, "").slice(0, 9) : "";

  const activities = Array.isArray(fd.activities ?? fd.activites)
    ? (fd.activities ?? fd.activites)
    : [];
  const actCols: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const a = activities[i - 1] as
      | { code?: any; caSharePercent?: any }
      | undefined;
    actCols[`LIBELLE_ACTIVITE_${i}`] =
      a?.code != null ? getActiviteTitle(a.code) : "";
    actCols[`POID_ACTIVITE_${i}`] =
      a?.caSharePercent != null ? String(a.caSharePercent) : "";
  }

  // Fin du mois de résiliation (pour ETAT_POLICE par ligne)
  let resiliationEndOfMonth: Date | null = null;
  if (resiliationDate) {
    const d = new Date(resiliationDate);
    resiliationEndOfMonth = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  const sharedFields = {
    APPORTEUR: APPORTEUR_CODE,
    IDENTIFIANT_POLICE: quoteRef,
    DATE_SOUSCRIPTION: dateSouscription,
    DATE_EFFET_CONTRAT: dateEffet,
    NUMERO_AVENANT: "",
    MOTIF_AVENANT: "",
    DATE_EFFET_AVENANT: "",
    FRACTIONNEMENT: fractionnement,
    NOM_ENTREPRISE_ASSURE: toStr(
      fd.companyName ?? cd.companyName ?? cd.name ?? cd.raisonSociale,
    ),
    SIREN: siren,
    ADRESSE_RISQUE: toStr(fd.address ?? cd.address ?? cd.adresse),
    VILLE_RISQUE: toStr(fd.city ?? cd.city ?? cd.ville),
    CODE_POSTAL_RISQUE: toStr(fd.postalCode ?? cd.postalCode ?? cd.codePostal),
    CA_ENTREPRISE: toStr(fd.chiffreAffaires ?? cd.revenue ?? cd.ca),
    EFFECTIF_ENTREPRISE: toStr(
      fd.nombreSalaries ?? cd.employeeCount ?? cd.effectif,
    ),
    CODE_NAF: toStr(fd.code_naf ?? fd.codeNAF),
    ...actCols,
  };

  return installments.map((inst) => {
    const instPeriodStart = inst.periodStart
      ? new Date(inst.periodStart)
      : null;
    const isResiliated =
      !!resiliationDate &&
      !!resiliationEndOfMonth &&
      !!instPeriodStart &&
      instPeriodStart <= resiliationEndOfMonth;

    // ETAT_POLICE pour cette ligne
    const etatPolice = isResiliated
      ? "RESILIE"
      : contract
        ? (CONTRACT_STATUS[contract.status] ?? "EN COURS")
        : (STATUS_POLICE[quoteStatus] ?? "DEVIS");

    // DATE_ETAT_POLICE = paidAt si payé, sinon emissionDate
    const dateStatPolice = inst.paidAt
      ? fmtDate(inst.paidAt)
      : inst.emissionDate
        ? fmtDate(inst.emissionDate)
        : "";

    // MOTIF_ETAT : RESILIATION / REGLEMENT / EMISSION
    const motifEtat = isResiliated
      ? "RESILIATION"
      : inst.status === "PAID" || inst.paidAt != null
        ? "REGLEMENT"
        : "EMISSION";

    return {
      ...sharedFields,
      DATE_FIN_CONTRAT: fmtDate(inst.periodEnd),
      DATE_ECHEANCE: fmtDate(inst.dueDate),
      ETAT_POLICE: etatPolice,
      DATE_ETAT_POLICE: dateStatPolice,
      MOTIF_ETAT: motifEtat,
      MOTIF_STATUT: motifEtat,
    } as PolicesRow;
  });
}

function computeQuittancesRows(
  installments: LocalInstallment[],
  fd: Record<string, any>,
  quoteRef: string,
): QuittancesRow[] {
  const region = fd.territory ?? fd.region;
  const rate =
    region && typeof region === "string" ? getTaxeByRegion(region) : undefined;
  const tauxTaxe =
    rate != null ? String(Math.round(rate * 100 * 100) / 100) : "";

  const periodicity = toStr(
    fd.periodicity ?? fd.periodicite ?? fd.fractionnementPrime,
  );
  const letter = getQuittanceLetter(periodicity);

  return installments.map((inst) => {
    const year = inst.dueDate
      ? new Date(inst.dueDate).toISOString().split("T")[0].split("-")[0]
      : String(new Date().getFullYear());
    const identifiantQuittance = letter
      ? `${quoteRef}${letter}${inst.installmentNumber}-${year}`
      : `${quoteRef}${inst.installmentNumber}-${year}`;
    const commission = Math.round(inst.amountHT * 0.24 * 100) / 100;
    let modePaiement = inst.paymentMethod
      ? (PAYMENT_METHOD_LABELS[inst.paymentMethod] ?? inst.paymentMethod)
      : "";
    if (inst.status === "PAID" && !modePaiement) modePaiement = "VIREMENT";

    return {
      APPORTEUR: APPORTEUR_CODE,
      IDENTIFIANT_POLICE: quoteRef,
      NUMERO_AVENANT: "",
      IDENTIFIANT_QUITTANCE: identifiantQuittance,
      DATE_EFFET_QUITTANCE: fmtDate(inst.periodStart),
      DATE_FIN_QUITTANCE: fmtDate(inst.periodEnd),
      DATE_ENCAISSEMENT: inst.paidAt ? fmtDate(inst.paidAt) : "",
      STATUT_QUITTANCE: QUITTANCE_STATUS[inst.status] ?? "EMISE",
      GARANTIE: "RC_RCD",
      PRIME_TTC: String(inst.amountTTC),
      PRIME_HT: String(inst.amountHT),
      TAXES: String(inst.taxAmount),
      TAXE_POURCENTAGE: tauxTaxe,
      COMMISSIONS: String(commission),
      MODE_PAIEMENT: modePaiement,
    };
  });
}

// ─── Section component ───────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Field helpers ───────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white";

// ─── Police field config (editable table with source descriptions) ────────────

type EditType = "text" | "date" | "number" | "readonly" | "siret" | "activity";

interface PoliceFieldConfig {
  key: string;
  label: string;
  /** Human-readable description of what this column represents in business terms */
  description: string;
  /** Technical source path in the data */
  source: string;
  /** Edit behaviour */
  editType: EditType;
  /** formData keys to read from (priority order) and write to (first key) */
  fdKeys?: string[];
  /** companyData keys to ALSO update when editing */
  cdKeys?: string[];
  /** Extra note shown below the input */
  note?: string;
}

const POLICE_FIELD_CONFIG: PoliceFieldConfig[] = [
  {
    key: "APPORTEUR",
    label: "Apporteur",
    description: "Code de l'apporteur (courtier) chez l'assureur Fidelidade",
    source: "Configuration serveur (env BORDEREAU_APPORTEUR)",
    editType: "readonly",
  },
  {
    key: "IDENTIFIANT_POLICE",
    label: "Identifiant police",
    description:
      "Numéro unique de la police qui identifie le contrat/devis chez Fidelidade",
    source: "quote.reference",
    editType: "readonly",
    note: "Modifiable via la référence du devis dans l'en-tête",
  },
  {
    key: "DATE_SOUSCRIPTION",
    label: "Date de souscription",
    description: "Date à laquelle le contrat a été souscrit par le client",
    source: "formData.dateDeffet → dateEffet → dateDebut → startDate",
    editType: "date",
    fdKeys: ["dateDeffet"],
  },
  {
    key: "DATE_EFFET_CONTRAT",
    label: "Date d'effet du contrat",
    description:
      "Date à partir de laquelle les garanties s'appliquent — obligatoirement liée à un contrat",
    source: "contract.startDate (vide si pas de contrat)",
    editType: "readonly",
    note: "Créez un contrat via le bouton dédié si cette valeur est vide",
  },
  {
    key: "DATE_FIN_CONTRAT",
    label: "Date de fin du contrat",
    description:
      "Date d'expiration des garanties (fin de la 1ère période d'échéance)",
    source: "installments[0].periodEnd",
    editType: "readonly",
    note: "Modifiable via la colonne « Fin période » dans Feuille 2 ci-dessous",
  },
  {
    key: "NUMERO_AVENANT",
    label: "Numéro d'avenant",
    description:
      "Numéro de l'avenant en cas de modification de contrat en cours",
    source: "Non géré — valeur vide",
    editType: "readonly",
  },
  {
    key: "MOTIF_AVENANT",
    label: "Motif de l'avenant",
    description: "Raison de la modification du contrat (avenant)",
    source: "Non géré — valeur vide",
    editType: "readonly",
  },
  {
    key: "DATE_EFFET_AVENANT",
    label: "Date d'effet avenant",
    description: "Date à partir de laquelle l'avenant prend effet",
    source: "Non géré — valeur vide",
    editType: "readonly",
  },
  {
    key: "DATE_ECHEANCE",
    label: "Date d'échéance",
    description:
      "Date d'appel de la première prime (date à laquelle la prime est due)",
    source: "installments[0].dueDate",
    editType: "readonly",
    note: "Modifiable via la colonne « Échéance » dans Feuille 2 ci-dessous",
  },
  {
    key: "ETAT_POLICE",
    label: "État de la police",
    description: "Statut actuel de la police (active, résiliée, suspendue…)",
    source: "contract.status (si contrat) sinon quote.status",
    editType: "readonly",
    note: "Dépend du statut du contrat ou du devis — modifiable dans les onglets Contrat / Résumé",
  },
  {
    key: "DATE_ETAT_POLICE",
    label: "Date état police",
    description:
      "Date d'émission de l'appel de prime (si payé : date de paiement, sinon : date d'émission saisie dans Feuille 2)",
    source: "installment.paidAt ?? installment.emissionDate",
    editType: "readonly",
    note: "Éditez la colonne « Date émission » dans Feuille 2 pour chaque échéance",
  },
  {
    key: "MOTIF_ETAT",
    label: "Motif état",
    description:
      "Raison de l'état de la police : REGLEMENT si payé, EMISSION si appel de prime envoyé, RESILIATION si résilié",
    source:
      "resiliationDate → RESILIATION | paidAt/PAID → REGLEMENT | sinon → EMISSION",
    editType: "readonly",
    note: "Calculé automatiquement selon le statut de l'échéance",
  },
  {
    key: "FRACTIONNEMENT",
    label: "Fractionnement",
    description:
      "Fréquence de paiement des primes (mensuel, trimestriel, semestriel, annuel)",
    source: "formData.periodicity → periodicite → fractionnementPrime",
    editType: "text",
    fdKeys: ["periodicity"],
    note: "ex : trimestriel, mensuel, semestriel, annuel",
  },
  {
    key: "NOM_ENTREPRISE_ASSURE",
    label: "Nom entreprise assurée",
    description:
      "Raison sociale complète de l'entreprise couverte par le contrat",
    source: "formData.companyName → companyData.companyName → raisonSociale",
    editType: "text",
    fdKeys: ["companyName"],
    cdKeys: ["companyName"],
  },
  {
    key: "SIREN",
    label: "SIREN",
    description: "Numéro SIREN (9 chiffres) identifiant l'entreprise en France",
    source: "formData.siret (9 premiers chiffres) → companyData.siret",
    editType: "siret",
    fdKeys: ["siret"],
    cdKeys: ["siret"],
    note: "Saisissez le SIRET complet (14 chiffres) — le SIREN est extrait automatiquement",
  },
  {
    key: "ADRESSE_RISQUE",
    label: "Adresse du risque",
    description: "Adresse physique du site assuré (là où le risque est situé)",
    source: "formData.address → companyData.address",
    editType: "text",
    fdKeys: ["address"],
    cdKeys: ["address"],
  },
  {
    key: "VILLE_RISQUE",
    label: "Ville du risque",
    description: "Commune du site assuré",
    source: "formData.city → companyData.city",
    editType: "text",
    fdKeys: ["city"],
    cdKeys: ["city"],
  },
  {
    key: "CODE_POSTAL_RISQUE",
    label: "Code postal du risque",
    description: "Code postal du site assuré",
    source: "formData.postalCode → companyData.postalCode",
    editType: "text",
    fdKeys: ["postalCode"],
    cdKeys: ["postalCode"],
  },
  {
    key: "CA_ENTREPRISE",
    label: "Chiffre d'affaires (€)",
    description:
      "Chiffre d'affaires annuel de l'entreprise — sert au calcul de la prime",
    source: "formData.chiffreAffaires → companyData.revenue",
    editType: "number",
    fdKeys: ["chiffreAffaires"],
  },
  {
    key: "EFFECTIF_ENTREPRISE",
    label: "Effectif",
    description: "Nombre de salariés de l'entreprise assurée",
    source: "formData.nombreSalaries → companyData.employeeCount",
    editType: "number",
    fdKeys: ["nombreSalaries"],
  },
  {
    key: "CODE_NAF",
    label: "Code NAF / APE",
    description:
      "Code identifiant l'activité principale de l'entreprise (nomenclature INSEE)",
    source: "formData.code_naf → formData.codeNAF",
    editType: "text",
    fdKeys: ["code_naf"],
  },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function BordereauTab({
  quote,
  calculationResult,
  session,
}: {
  quote: Quote;
  calculationResult: CalculationResult | null;
  session: any;
}) {
  const [editFd, setEditFd] = useState<Record<string, any>>({});
  const [editCd, setEditCd] = useState<Record<string, any>>({});
  const [installments, setInstallments] = useState<LocalInstallment[]>([]);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Création de contrat ───────────────────────────────────────────────────
  const [showCreateContractModal, setShowCreateContractModal] = useState(false);
  const [createContractDate, setCreateContractDate] = useState<string>("");
  const [creatingContract, setCreatingContract] = useState(false);

  // ── Résiliation ────────────────────────────────────────────────────────────
  const [resiliationDate, setResiliationDate] = useState<string | null>(null);
  const [resiliationReason, setResiliationReason] = useState<string>("");
  const [showResiliationModal, setShowResiliationModal] = useState(false);
  const [resiliationModalDate, setResiliationModalDate] = useState<string>("");
  const [resiliationModalReason, setResiliationModalReason] =
    useState<string>("");
  const [resiliating, setResiliating] = useState(false);

  // ── Init from props ────────────────────────────────────────────────────────
  useEffect(() => {
    setEditFd((quote.formData as Record<string, any>) ?? {});
    setEditCd((quote.companyData as Record<string, any>) ?? {});
  }, [quote.id]);

  // ── Fetch payment schedule & contract ────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, contractRes] = await Promise.all([
        fetch(`/api/quotes/${quote.id}/payment-schedule`),
        fetch(`/api/quotes/${quote.id}/contract`),
      ]);

      if (schedRes.ok) {
        const raw = await schedRes.json();
        const sched = raw.data ?? raw;
        if (sched?.payments) {
          setInstallments(sched.payments.map(mapApiInstallment));
          setHasSchedule(true);
          // Charger la date de résiliation si définie
          if (sched.resiliationDate) {
            const rd = new Date(sched.resiliationDate)
              .toISOString()
              .split("T")[0];
            setResiliationDate(rd);
            setResiliationReason(sched.resiliationReason ?? "");
          } else {
            setResiliationDate(null);
            setResiliationReason("");
          }
        } else {
          setHasSchedule(false);
          setResiliationDate(null);
        }
      } else {
        setHasSchedule(false);
        setResiliationDate(null);
      }

      if (contractRes.ok) {
        const raw = await contractRes.json();
        setContract(raw.data ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [quote.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Computed bordereau rows ───────────────────────────────────────────────
  const policesRows = useMemo(
    () =>
      computePolicesRows(
        installments,
        editFd,
        editCd,
        quote.reference,
        quote.status,
        contract,
        resiliationDate,
      ),
    [
      installments,
      editFd,
      editCd,
      quote.reference,
      quote.status,
      contract,
      resiliationDate,
    ],
  );
  // Première ligne pour l'affichage des champs partagés dans la config
  const policesRow = policesRows[0] ?? null;

  const quittancesRows = useMemo(
    () => computeQuittancesRows(installments, editFd, quote.reference),
    [installments, editFd, quote.reference],
  );

  // ── Field update helpers ──────────────────────────────────────────────────
  const setFd = (key: string, value: any) => {
    setEditFd((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const setCd = (key: string, value: any) => {
    setEditCd((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const setInst = (idx: number, key: keyof LocalInstallment, value: any) => {
    setInstallments((prev) =>
      prev.map((inst, i) => (i === idx ? { ...inst, [key]: value } : inst)),
    );
    setIsDirty(true);
  };

  const addInstallment = () => {
    const last = installments[installments.length - 1];
    const newInst: LocalInstallment = {
      id: `new-${Date.now()}`,
      installmentNumber: installments.length + 1,
      dueDate: last?.dueDate ?? "",
      periodStart: last?.periodEnd ?? "",
      periodEnd: "",
      amountHT: 0,
      taxAmount: 0,
      amountTTC: 0,
      rcdAmount: null,
      pjAmount: null,
      feesAmount: null,
      resumeAmount: null,
      status: "PENDING",
      paidAt: null,
      paidAmount: null,
      paymentMethod: null,
      emissionDate: null,
    };
    setInstallments((prev) => [...prev, newInst]);
    setIsDirty(true);
  };

  const removeInstallment = (idx: number) => {
    setInstallments((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((inst, i) => ({ ...inst, installmentNumber: i + 1 })),
    );
    setIsDirty(true);
  };

  const resetChanges = () => {
    setEditFd((quote.formData as Record<string, any>) ?? {});
    setEditCd((quote.companyData as Record<string, any>) ?? {});
    fetchData();
    setIsDirty(false);
  };

  // ── Résiliation helpers ───────────────────────────────────────────────────

  /** Fin du mois de résiliation (pour filtrage visuel dans la table) */
  const resiliationEndOfMonth = useMemo<Date | null>(() => {
    if (!resiliationDate) return null;
    const d = new Date(resiliationDate);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }, [resiliationDate]);

  /** Retourne true si l'échéance est exclue du bordereau (après le mois de résiliation) */
  const isExcludedByResiliation = (inst: LocalInstallment): boolean => {
    if (!resiliationEndOfMonth) return false;
    const periodStart = inst.periodStart ? new Date(inst.periodStart) : null;
    if (!periodStart) return false;
    return periodStart > resiliationEndOfMonth;
  };

  const openResiliationModal = () => {
    // Pré-remplir avec la date du jour si pas de date existante
    setResiliationModalDate(
      resiliationDate ?? new Date().toISOString().split("T")[0],
    );
    setResiliationModalReason(resiliationReason);
    setShowResiliationModal(true);
  };

  const handleResiliate = async () => {
    if (!resiliationModalDate) return;
    setResiliating(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/resiliate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resiliationDate: resiliationModalDate,
          resiliationReason: resiliationModalReason || null,
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la résiliation");
      setResiliationDate(resiliationModalDate);
      setResiliationReason(resiliationModalReason);
      setShowResiliationModal(false);
      // Rafraîchir le contrat (statut CANCELLED)
      const contractRes = await fetch(`/api/quotes/${quote.id}/contract`);
      if (contractRes.ok) {
        const raw = await contractRes.json();
        setContract(raw.data ?? null);
      }
      setSaveMsg({
        type: "success",
        text: `Contrat résilié au ${new Date(resiliationModalDate).toLocaleDateString("fr-FR")}`,
      });
      setTimeout(() => setSaveMsg(null), 5000);
    } catch (err) {
      setSaveMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur résiliation",
      });
    } finally {
      setResiliating(false);
    }
  };

  const handleUndoResiliate = async () => {
    if (!confirm("Annuler la résiliation et remettre le contrat actif ?"))
      return;
    setResiliating(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/resiliate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resiliationDate: null }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'annulation");
      setResiliationDate(null);
      setResiliationReason("");
      // Rafraîchir le contrat
      const contractRes = await fetch(`/api/quotes/${quote.id}/contract`);
      if (contractRes.ok) {
        const raw = await contractRes.json();
        setContract(raw.data ?? null);
      }
      setSaveMsg({
        type: "success",
        text: "Résiliation annulée — contrat remis actif",
      });
      setTimeout(() => setSaveMsg(null), 5000);
    } catch (err) {
      setSaveMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setResiliating(false);
    }
  };

  // ── Création contrat ──────────────────────────────────────────────────────
  const handleCreateContract = async () => {
    if (!createContractDate) return;
    setCreatingContract(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: createContractDate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Erreur création contrat");
      }
      const raw = await res.json();
      setContract(raw.data ?? null);
      setShowCreateContractModal(false);
      setSaveMsg({
        type: "success",
        text: `Contrat créé avec date d'effet au ${new Date(createContractDate).toLocaleDateString("fr-FR")}`,
      });
      setTimeout(() => setSaveMsg(null), 5000);
    } catch (err) {
      setSaveMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur création contrat",
      });
    } finally {
      setCreatingContract(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      // 1. Save formData / companyData changes
      const quoteRes = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: editFd,
          companyData: editCd,
          changeReason: "Mise à jour depuis l'onglet Bordereau",
        }),
      });
      if (!quoteRes.ok)
        throw new Error("Erreur lors de la mise à jour du devis");

      // 2. Save installments (only if schedule exists or we have installments)
      if (hasSchedule || installments.length > 0) {
        const schedRes = await fetch(
          `/api/quotes/${quote.id}/payment-schedule`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payments: installments.map((inst) => ({
                id: inst.id,
                dueDate: inst.dueDate,
                periodStart: inst.periodStart,
                periodEnd: inst.periodEnd,
                amountHT: inst.amountHT,
                taxAmount: inst.taxAmount,
                amountTTC: inst.amountTTC,
                rcdAmount: inst.rcdAmount,
                pjAmount: inst.pjAmount,
                feesAmount: inst.feesAmount,
                resumeAmount: inst.resumeAmount,
                paidAt: inst.paidAt ?? null,
                paidAmount: inst.paidAmount,
                emissionDate: inst.emissionDate ?? null,
              })),
            }),
          },
        );
        if (!schedRes.ok)
          throw new Error("Erreur lors de la mise à jour de l'échéancier");
      }

      setIsDirty(false);
      setSaveMsg({
        type: "success",
        text: "Modifications enregistrées avec succès.",
      });
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err) {
      setSaveMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Generate schedule ─────────────────────────────────────────────────────
  const generateSchedule = async (empty = false) => {
    setGenerating(true);
    try {
      const body = empty ? { createEmpty: true } : { calculationResult };

      const res = await fetch(`/api/quotes/${quote.id}/payment-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erreur génération échéancier");
      const raw = await res.json();
      const sched = raw.data ?? raw;
      if (sched?.payments) {
        setInstallments(sched.payments.map(mapApiInstallment));
        setHasSchedule(true);
      }
    } catch (err) {
      setSaveMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur génération",
      });
    } finally {
      setGenerating(false);
    }
  };

  // ── Activities in formData ────────────────────────────────────────────────
  const activities: { code: string; caSharePercent: string }[] = Array.isArray(
    editFd.activities ?? editFd.activites,
  )
    ? (editFd.activities ?? editFd.activites).map((a: any) => ({
        code: String(a?.code ?? ""),
        caSharePercent: String(a?.caSharePercent ?? ""),
      }))
    : [];

  const setActivity = (
    idx: number,
    key: "code" | "caSharePercent",
    val: string,
  ) => {
    const updated = [...activities];
    while (updated.length <= idx)
      updated.push({ code: "", caSharePercent: "" });
    updated[idx] = { ...updated[idx], [key]: val };
    // Remove trailing empty activities
    const trimmed = [...updated];
    while (
      trimmed.length > 0 &&
      !trimmed[trimmed.length - 1].code &&
      !trimmed[trimmed.length - 1].caSharePercent
    ) {
      trimmed.pop();
    }
    const typed = trimmed.map((a) => ({
      code: a.code === "" ? null : Number(a.code),
      caSharePercent: a.caSharePercent === "" ? 0 : Number(a.caSharePercent),
    }));
    const fdKey = "activities" in editFd ? "activities" : "activites";
    setFd(fdKey, typed);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-3" />
        <span className="text-gray-500">Chargement des données bordereau…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Bordereau Fidelidade
              {resiliationDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                  <Ban className="w-3 h-3" />
                  Résilié le{" "}
                  {new Date(resiliationDate).toLocaleDateString("fr-FR")}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500">
              Modifiez les données ci-dessous — le bordereau se met à jour
              instantanément
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Bouton résiliation */}
          {hasSchedule && !resiliationDate && (
            <button
              onClick={openResiliationModal}
              disabled={resiliating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Résilier le contrat
            </button>
          )}
          {resiliationDate && (
            <button
              onClick={handleUndoResiliate}
              disabled={resiliating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
            >
              {resiliating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Undo2 className="w-4 h-4" />
              )}
              Annuler la résiliation
            </button>
          )}
          {isDirty && (
            <button
              onClick={resetChanges}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Annuler
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Enregistrement…" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div
          className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
            saveMsg.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {saveMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {saveMsg.text}
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* ── Left panel: Edit form ────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1">
            <span className="w-2 h-2 bg-indigo-600 rounded-full inline-block" />
            Données du devis
          </div>

          {/* Société */}
          <Section title="🏢 Société">
            <Field label="Nom de l'entreprise assurée">
              <input
                className={inputCls}
                value={toStr(
                  editFd.companyName ??
                    editCd.companyName ??
                    editCd.name ??
                    editCd.raisonSociale,
                )}
                onChange={(e) => {
                  setCd("companyName", e.target.value);
                  setFd("companyName", e.target.value);
                }}
                placeholder="Raison sociale"
              />
            </Field>
            <Field label="SIRET">
              <input
                className={inputCls}
                value={toStr(editFd.siret ?? editCd.siret)}
                onChange={(e) => {
                  setFd("siret", e.target.value);
                  setCd("siret", e.target.value);
                }}
                placeholder="14 chiffres"
                maxLength={14}
              />
            </Field>
            <Field label="Chiffre d'affaires (€)">
              <input
                className={inputCls}
                type="number"
                value={toStr(
                  editFd.chiffreAffaires ?? editCd.revenue ?? editCd.ca,
                )}
                onChange={(e) => setFd("chiffreAffaires", e.target.value)}
                placeholder="ex : 500000"
              />
            </Field>
            <Field label="Effectif">
              <input
                className={inputCls}
                type="number"
                value={toStr(
                  editFd.nombreSalaries ??
                    editCd.employeeCount ??
                    editCd.effectif,
                )}
                onChange={(e) => setFd("nombreSalaries", e.target.value)}
                placeholder="ex : 10"
              />
            </Field>
          </Section>

          {/* Adresse du risque */}
          <Section title="📍 Adresse du risque">
            <Field label="Adresse">
              <input
                className={inputCls}
                value={toStr(
                  editFd.address ?? editCd.address ?? editCd.adresse,
                )}
                onChange={(e) => {
                  setFd("address", e.target.value);
                  setCd("address", e.target.value);
                }}
                placeholder="N° rue"
              />
            </Field>
            <Field label="Code postal">
              <input
                className={inputCls}
                value={toStr(
                  editFd.postalCode ?? editCd.postalCode ?? editCd.codePostal,
                )}
                onChange={(e) => {
                  setFd("postalCode", e.target.value);
                  setCd("postalCode", e.target.value);
                }}
                placeholder="ex : 75001"
                maxLength={10}
              />
            </Field>
            <Field label="Ville">
              <input
                className={inputCls}
                value={toStr(editFd.city ?? editCd.city ?? editCd.ville)}
                onChange={(e) => {
                  setFd("city", e.target.value);
                  setCd("city", e.target.value);
                }}
                placeholder="ex : Paris"
              />
            </Field>
          </Section>

          {/* Paramètres produit */}
          <Section title="⚙️ Paramètres produit">
            <Field label="Code NAF">
              <input
                className={inputCls}
                value={toStr(editFd.code_naf ?? editFd.codeNAF)}
                onChange={(e) => setFd("code_naf", e.target.value)}
                placeholder="ex : 4120A"
              />
            </Field>
            <Field label="Territoire">
              <input
                className={inputCls}
                value={toStr(editFd.territory ?? editFd.region)}
                onChange={(e) => setFd("territory", e.target.value)}
                placeholder="ex : guadeloupe"
              />
            </Field>
            <Field label="Périodicité (fractionnement)">
              <input
                className={inputCls}
                value={toStr(
                  editFd.periodicity ??
                    editFd.periodicite ??
                    editFd.fractionnementPrime,
                )}
                onChange={(e) => setFd("periodicity", e.target.value)}
                placeholder="ex : trimestriel"
              />
            </Field>
            <Field label="Date d'effet">
              <input
                className={inputCls}
                type="date"
                value={toISODateString(
                  editFd.dateDeffet ??
                    editFd.dateEffet ??
                    editFd.dateDebut ??
                    editFd.startDate,
                )}
                onChange={(e) => setFd("dateDeffet", e.target.value)}
              />
            </Field>
          </Section>

          {/* Activités */}
          <Section title="🔨 Activités (jusqu'à 8)" defaultOpen={false}>
            <div className="text-xs text-gray-500 mb-2">
              Code activité (1–20) et part du CA (%)
            </div>
            {Array.from({ length: 8 }).map((_, i) => {
              const act = activities[i] ?? { code: "", caSharePercent: "" };
              const title = act.code ? getActiviteTitle(act.code) : "—";
              return (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {i === 0 && (
                      <div className="text-xs text-gray-400 mb-1">Code</div>
                    )}
                    <input
                      className={inputCls}
                      type="number"
                      min={1}
                      max={20}
                      value={act.code}
                      onChange={(e) => setActivity(i, "code", e.target.value)}
                      placeholder={String(i + 1)}
                    />
                  </div>
                  <div className="w-16">
                    {i === 0 && (
                      <div className="text-xs text-gray-400 mb-1">% CA</div>
                    )}
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      max={100}
                      value={act.caSharePercent}
                      onChange={(e) =>
                        setActivity(i, "caSharePercent", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              );
            })}
            {activities.some((a) => a.code) && (
              <div className="mt-2 space-y-1">
                {activities
                  .filter((a) => a.code)
                  .map((a, i) => (
                    <div
                      key={i}
                      className="text-xs text-gray-500 flex items-center gap-1"
                    >
                      <span className="font-medium text-gray-700">
                        {a.code}
                      </span>
                      <span>→</span>
                      <span>{getActiviteTitle(a.code)}</span>
                    </div>
                  ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Right panel: Bordereau ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {/* ── Feuille 1 – Police ─────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-indigo-600 rounded-sm" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Feuille 1 — Police
              </h3>
              <span className="text-xs text-gray-400">
                (une ligne par échéance)
              </span>
            </div>

            {/* Bannière : pas de contrat → DATE_EFFET_CONTRAT vide */}
            {!contract && (
              <div className="mb-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-xs text-amber-800">
                  <strong>DATE_EFFET_CONTRAT sera vide</strong> — aucun contrat
                  n'est associé à ce devis. Créez un contrat pour définir la
                  date à partir de laquelle les garanties s'appliquent.
                </div>
                <button
                  onClick={() => {
                    setCreateContractDate(
                      new Date().toISOString().split("T")[0],
                    );
                    setShowCreateContractModal(true);
                  }}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer le contrat
                </button>
              </div>
            )}

            {installments.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Aucun échéancier — les lignes Police seront générées après
                création des échéances ci-dessous.
              </div>
            ) : (
              <>
                {/* ─ Champs partagés (société / contrat) ─ */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Champs communs à toutes les lignes
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-indigo-700 text-white text-xs">
                        <th className="px-4 py-2 text-left font-semibold w-48">
                          Colonne bordereau
                        </th>
                        <th className="px-4 py-2 text-left font-semibold">
                          Correspond à
                        </th>
                        <th className="px-4 py-2 text-left font-semibold w-56">
                          Valeur
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {POLICE_FIELD_CONFIG.map((cfg, rowIdx) => {
                        const computedVal = policesRow?.[cfg.key] ?? "";
                        const isReadonly = cfg.editType === "readonly";
                        const rowBg =
                          rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50";

                        const currentFdVal = cfg.fdKeys
                          ? toStr(
                              cfg.fdKeys.reduce(
                                (acc: any, k) => acc ?? editFd[k],
                                undefined as any,
                              ),
                            )
                          : "";
                        const currentCdVal = cfg.cdKeys
                          ? toStr(
                              cfg.cdKeys.reduce(
                                (acc: any, k) => acc ?? editCd[k],
                                undefined as any,
                              ),
                            )
                          : "";
                        const currentVal =
                          currentFdVal || currentCdVal || computedVal;

                        const handleChange = (val: string) => {
                          if (!cfg.fdKeys?.[0]) return;
                          setFd(cfg.fdKeys[0], val || undefined);
                          if (cfg.cdKeys?.[0])
                            setCd(cfg.cdKeys[0], val || undefined);
                        };

                        return (
                          <tr key={cfg.key} className={rowBg}>
                            <td className="px-4 py-2.5 align-top">
                              <div className="font-mono text-xs font-bold text-indigo-800 leading-tight">
                                {cfg.key}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {cfg.label}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-top">
                              <div className="text-xs text-gray-700 leading-snug">
                                {cfg.description}
                              </div>
                              <div className="mt-1 font-mono text-xs text-indigo-400 leading-tight">
                                {cfg.source}
                              </div>
                              {cfg.note && (
                                <div className="mt-1 text-xs text-amber-600 italic">
                                  ⚠ {cfg.note}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 align-middle">
                              {isReadonly ? (
                                <span
                                  className={`text-sm px-2 py-1 rounded ${computedVal ? "font-medium text-gray-900" : "text-gray-300 italic"}`}
                                >
                                  {computedVal || "—"}
                                </span>
                              ) : cfg.editType === "siret" ? (
                                <div>
                                  <input
                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-yellow-50"
                                    value={toStr(editFd.siret ?? editCd.siret)}
                                    onChange={(e) =>
                                      handleChange(e.target.value)
                                    }
                                    placeholder="14 chiffres"
                                    maxLength={14}
                                  />
                                  {computedVal && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      SIREN extrait :{" "}
                                      <span className="font-mono font-medium text-gray-600">
                                        {computedVal}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : cfg.editType === "date" ? (
                                <input
                                  type="date"
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-yellow-50"
                                  value={toISODateString(
                                    cfg.fdKeys
                                      ? cfg.fdKeys.reduce(
                                          (acc: any, k) => acc ?? editFd[k],
                                          undefined as any,
                                        )
                                      : undefined,
                                  )}
                                  onChange={(e) => handleChange(e.target.value)}
                                />
                              ) : cfg.editType === "number" ? (
                                <input
                                  type="number"
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-yellow-50"
                                  value={currentVal}
                                  onChange={(e) => handleChange(e.target.value)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-yellow-50"
                                  value={currentVal}
                                  onChange={(e) => handleChange(e.target.value)}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Activities */}
                      {Array.from({ length: 8 }).map((_, i) => {
                        const act = activities[i] ?? {
                          code: "",
                          caSharePercent: "",
                        };
                        const title = act.code
                          ? getActiviteTitle(act.code)
                          : "";
                        const rowBg =
                          (POLICE_FIELD_CONFIG.length + i * 2) % 2 === 0
                            ? "bg-white"
                            : "bg-gray-50";
                        return (
                          <tr key={`act-${i}`} className={rowBg}>
                            <td className="px-4 py-2.5 align-top">
                              <div className="font-mono text-xs font-bold text-indigo-800 leading-tight">
                                LIBELLE_ACTIVITE_{i + 1}
                              </div>
                              <div className="font-mono text-xs font-bold text-indigo-800 leading-tight mt-1">
                                POID_ACTIVITE_{i + 1}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-top">
                              <div className="text-xs text-gray-700">
                                Activité {i + 1} — libellé depuis code (1–20) et
                                % CA
                              </div>
                              <div className="font-mono text-xs text-indigo-400 mt-0.5">
                                formData.activities[{i}].code → title
                              </div>
                              <div className="font-mono text-xs text-indigo-400">
                                formData.activities[{i}].caSharePercent
                              </div>
                              {title && (
                                <div className="mt-1 text-xs text-emerald-600 font-medium">
                                  → {title}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <div className="flex gap-1.5 items-center">
                                <div className="flex-1">
                                  <div className="text-xs text-gray-400 mb-0.5">
                                    Code (1–20)
                                  </div>
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-yellow-50"
                                    value={act.code}
                                    onChange={(e) =>
                                      setActivity(i, "code", e.target.value)
                                    }
                                    placeholder="—"
                                  />
                                </div>
                                <div className="w-16">
                                  <div className="text-xs text-gray-400 mb-0.5">
                                    % CA
                                  </div>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-yellow-50"
                                    value={act.caSharePercent}
                                    onChange={(e) =>
                                      setActivity(
                                        i,
                                        "caSharePercent",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-yellow-50 border border-gray-300 rounded inline-block" />
                      Champ éditable
                    </span>
                  </div>
                </div>

                {/* ─ Aperçu Polices : une ligne par échéance ─ */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Aperçu bordereau — une ligne par échéance
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-indigo-50 text-indigo-800 text-xs border-b border-indigo-200">
                          <th className="px-3 py-2 text-center font-semibold">
                            N°
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            DATE_FIN_CONTRAT
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            DATE_ECHEANCE
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            DATE_ETAT_POLICE
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            ETAT_POLICE
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            MOTIF_ETAT
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {policesRows.map((row, idx) => {
                          const inst = installments[idx];
                          const excluded = inst
                            ? isExcludedByResiliation(inst)
                            : false;
                          const motifColor =
                            row.MOTIF_ETAT === "REGLEMENT"
                              ? "text-emerald-700 bg-emerald-50"
                              : row.MOTIF_ETAT === "RESILIATION"
                                ? "text-red-700 bg-red-50"
                                : "text-amber-700 bg-amber-50";
                          return (
                            <tr
                              key={idx}
                              className={
                                excluded
                                  ? "opacity-40 bg-red-50"
                                  : idx % 2 === 0
                                    ? "bg-white"
                                    : "bg-gray-50"
                              }
                              title={
                                excluded
                                  ? "Hors bordereau (après résiliation)"
                                  : undefined
                              }
                            >
                              <td className="px-3 py-2 text-center font-semibold text-gray-700">
                                {inst?.installmentNumber ?? idx + 1}
                                {excluded && (
                                  <div className="text-xs text-red-400 font-normal">
                                    Hors BDX
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                {row.DATE_FIN_CONTRAT || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                {row.DATE_ECHEANCE || "—"}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {row.DATE_ETAT_POLICE ? (
                                  <span className="text-gray-700">
                                    {row.DATE_ETAT_POLICE}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 italic">
                                    Non définie — saisir date émission
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${
                                    row.ETAT_POLICE === "RESILIE"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {row.ETAT_POLICE || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${motifColor}`}
                                >
                                  {row.MOTIF_ETAT || "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
                    DATE_ETAT_POLICE = <span className="font-mono">paidAt</span>{" "}
                    si payé, sinon{" "}
                    <span className="font-mono">emissionDate</span> (colonne «
                    Date émission » dans Feuille 2)
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Feuille 2 – Quittances ─────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-600 rounded-sm" />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                  Feuille 2 — Quittances
                </h3>
                <span className="text-xs text-gray-400">
                  ({installments.length} ligne
                  {installments.length !== 1 ? "s" : ""})
                </span>
              </div>
              {hasSchedule && (
                <button
                  onClick={addInstallment}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une échéance
                </button>
              )}
            </div>

            {/* No schedule state */}
            {!hasSchedule && installments.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Aucun échéancier associé à ce devis
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Créez un échéancier pour voir les quittances dans le
                  bordereau.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {calculationResult && (
                    <button
                      onClick={() => generateSchedule(false)}
                      disabled={generating}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {generating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                      )}
                      Générer depuis le calcul RCD
                    </button>
                  )}
                  <button
                    onClick={() => generateSchedule(true)}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Créer manuellement
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="text-xs min-w-full">
                    <thead>
                      <tr className="bg-emerald-700 text-white">
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          N°
                        </th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          ID Quittance
                        </th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          Début période
                        </th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          Fin période
                        </th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          Échéance
                        </th>
                        <th
                          className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                          title="Date d'émission de l'appel de prime — utilisée dans DATE_ETAT_POLICE si la prime n'est pas payée"
                        >
                          Date émission ⓘ
                        </th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          Prime HT (€)
                        </th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          Taxes (€)
                        </th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          Prime TTC (€)
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                          Taux taxe
                        </th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          Commission
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                          Statut
                        </th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          Date encaissement
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                          Mode paiement
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {installments.map((inst, idx) => {
                        const row = quittancesRows[idx];
                        const excluded = isExcludedByResiliation(inst);
                        return (
                          <tr
                            key={inst.id}
                            className={
                              excluded
                                ? "opacity-40 bg-red-50 line-through-[cells]"
                                : "hover:bg-gray-50 transition-colors"
                            }
                            title={
                              excluded
                                ? "Hors bordereau : période après la résiliation"
                                : undefined
                            }
                          >
                            {/* N° + badge hors bordereau */}
                            <td className="px-3 py-1.5 font-semibold text-gray-700 text-center">
                              {inst.installmentNumber}
                              {excluded && (
                                <div className="text-xs font-normal text-red-500 whitespace-nowrap mt-0.5">
                                  Hors bordereau
                                </div>
                              )}
                            </td>
                            {/* ID Quittance */}
                            <td
                              className={`px-3 py-1.5 font-mono whitespace-nowrap ${excluded ? "text-red-400 line-through" : "text-indigo-700"}`}
                            >
                              {row?.IDENTIFIANT_QUITTANCE ?? "—"}
                            </td>
                            {/* Début période */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <input
                                type="date"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-32"
                                value={inst.periodStart}
                                onChange={(e) =>
                                  setInst(idx, "periodStart", e.target.value)
                                }
                              />
                            </td>
                            {/* Fin période */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <input
                                type="date"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-32"
                                value={inst.periodEnd}
                                onChange={(e) =>
                                  setInst(idx, "periodEnd", e.target.value)
                                }
                              />
                            </td>
                            {/* Échéance */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <input
                                type="date"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-32"
                                value={inst.dueDate}
                                onChange={(e) =>
                                  setInst(idx, "dueDate", e.target.value)
                                }
                              />
                            </td>
                            {/* Date émission d'appel de prime → DATE_ETAT_POLICE */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <input
                                type="date"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-32"
                                value={inst.emissionDate ?? ""}
                                onChange={(e) =>
                                  setInst(
                                    idx,
                                    "emissionDate",
                                    e.target.value || null,
                                  )
                                }
                                title="DATE_ETAT_POLICE si prime non payée"
                              />
                            </td>
                            {/* Prime HT */}
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-24"
                                value={inst.amountHT}
                                onChange={(e) =>
                                  setInst(
                                    idx,
                                    "amountHT",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </td>
                            {/* Taxes */}
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-20"
                                value={inst.taxAmount}
                                onChange={(e) =>
                                  setInst(
                                    idx,
                                    "taxAmount",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </td>
                            {/* Prime TTC */}
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-24"
                                value={inst.amountTTC}
                                onChange={(e) =>
                                  setInst(
                                    idx,
                                    "amountTTC",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </td>
                            {/* Taux taxe % */}
                            <td className="px-3 py-1.5 text-center text-gray-600">
                              {row?.TAXE_POURCENTAGE
                                ? `${row.TAXE_POURCENTAGE}%`
                                : "—"}
                            </td>
                            {/* Commission */}
                            <td className="px-3 py-1.5 text-right text-gray-600 font-medium">
                              {row?.COMMISSIONS ?? "—"}
                            </td>
                            {/* Statut */}
                            <td className="px-1 py-1">
                              <select
                                className="border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50"
                                value={inst.status}
                                onChange={(e) =>
                                  setInst(idx, "status", e.target.value)
                                }
                              >
                                {INSTALLMENT_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* Date encaissement */}
                            <td className="px-1 py-1">
                              <input
                                type="date"
                                className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50 w-32"
                                value={inst.paidAt ?? ""}
                                onChange={(e) =>
                                  setInst(idx, "paidAt", e.target.value || null)
                                }
                              />
                            </td>
                            {/* Mode paiement */}
                            <td className="px-1 py-1">
                              <select
                                className="border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-yellow-50"
                                value={inst.paymentMethod ?? ""}
                                onChange={(e) =>
                                  setInst(
                                    idx,
                                    "paymentMethod",
                                    e.target.value || null,
                                  )
                                }
                              >
                                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* Delete */}
                            <td className="px-3 py-1.5 text-center">
                              <button
                                onClick={() => removeInstallment(idx)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                                title="Supprimer cette échéance"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Totals footer */}
                    {installments.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 font-semibold text-gray-700 border-t-2 border-gray-300">
                          <td
                            className="px-3 py-2 text-right text-xs"
                            colSpan={5}
                          >
                            TOTAUX
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {installments
                              .reduce((s, i) => s + i.amountHT, 0)
                              .toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {installments
                              .reduce((s, i) => s + i.taxAmount, 0)
                              .toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {installments
                              .reduce((s, i) => s + i.amountTTC, 0)
                              .toFixed(2)}
                          </td>
                          <td />
                          <td className="px-3 py-2 text-right text-xs">
                            {(
                              installments.reduce((s, i) => s + i.amountHT, 0) *
                              0.24
                            ).toFixed(2)}
                          </td>
                          <td colSpan={4} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Add row button below table */}
                <button
                  onClick={addInstallment}
                  className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une échéance
                </button>

                {/* Legend */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-50 border border-gray-200 rounded inline-block" />
                    Cellule éditable
                  </span>
                  <span>Commission = Prime HT × 24%</span>
                  {resiliationDate && (
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-3 h-3 bg-red-50 border border-red-200 rounded inline-block opacity-40" />
                      Hors bordereau (après résiliation du{" "}
                      {new Date(resiliationDate).toLocaleDateString("fr-FR")})
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modale de création de contrat ───────────────────────────────── */}
      {showCreateContractModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Créer le contrat
                </h3>
              </div>
              <button
                onClick={() => setShowCreateContractModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Un contrat sera créé et associé à ce devis. La{" "}
              <strong>date d'effet</strong> détermine la valeur de{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">
                DATE_EFFET_CONTRAT
              </code>{" "}
              dans le bordereau.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'effet (startDate) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={createContractDate}
                onChange={(e) => setCreateContractDate(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                La date de fin sera fixée à un an plus tard automatiquement.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateContractModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateContract}
                disabled={!createContractDate || creatingContract}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingContract ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Créer le contrat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale de résiliation ────────────────────────────────────────── */}
      {showResiliationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Résilier le contrat
                </h3>
              </div>
              <button
                onClick={() => setShowResiliationModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
              <strong>Conséquences :</strong>
              <ul className="mt-1 list-disc ml-4 space-y-1">
                <li>
                  Les échéances du <strong>mois de résiliation</strong>{" "}
                  apparaîtront dans le bordereau avec{" "}
                  <code className="bg-amber-100 px-1 rounded">
                    ETAT_POLICE = RESILIE
                  </code>
                </li>
                <li>
                  Les échéances des <strong>mois suivants</strong>{" "}
                  n'apparaîtront plus dans aucun bordereau
                </li>
                <li>
                  Le statut du contrat sera mis à <strong>RÉSILIÉ</strong>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de résiliation <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  value={resiliationModalDate}
                  onChange={(e) => setResiliationModalDate(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Les échéances dont la période débute après ce mois seront
                  exclues du bordereau.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif de résiliation{" "}
                  <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  rows={2}
                  placeholder="ex : Non-paiement des primes, résiliation à l'initiative de l'assuré…"
                  value={resiliationModalReason}
                  onChange={(e) => setResiliationModalReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowResiliationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleResiliate}
                disabled={!resiliationModalDate || resiliating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resiliating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Confirmer la résiliation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
