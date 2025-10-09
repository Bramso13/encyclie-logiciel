export interface CompanyData {
  siret: string;
  address: string;
  legalForm: string;
  companyName: string;
  creationDate: string;
  directorName: string;
  city: string;
  postalCode: string;
}
// Interface simplifiée pour éviter les conflits de types
export type CalculationResult = any;

export interface ActivityShare {
  code: string;
  caSharePercent: number;
}

export interface FormData {
  // Informations de base
  honoraireCourtier: string;
  enCreation: boolean;
  city: string;
  postalCode: string;
  directorName: string;
  siret: string;
  address: string;
  includePJ: boolean;
  legalForm: string;
  territory: string;
  activities: ActivityShare[];
  companyName: string;
  periodicity: string;
  nombreSalaries: string;
  tradingPercent: string;
  chiffreAffaires: string;
  experienceMetier: string;
  hasQualification: boolean;
  previousRcdStatus: string;
  dateDeffet: string;
  companyCreationDate: string;
  subContractingPercent: string;
  previousResiliationDate?: string;
  lossHistory?: Array<{ year: number; numClaims: number; totalCost: number }>;

  // Nouveaux champs détectés
  absenceDeSinistreSurLes5DernieresAnnees?: string;
  assureurDefaillant?: boolean;
  creationDate?: string;
  mailAddress?: string;
  nombreAnneeAssuranceContinue?: string;
  phoneNumber?: string;
  previousInsurer?: string;
  motifResiliation?: string;
  sinistre36Mois?: boolean;
  evenementsResponsabilite?: boolean;
  procedureCollective?: boolean;
  negoceMateriaux?: boolean;
  natureProduitsNegoce?: string;
  chiffreAffairesNegoce?: string;
  autoEntrepreneur?: boolean;
  qualification?: string;
  protectionJuridique?: boolean;
  resiliePar?: string;
  detailsSinistre?: string;
  detailsEvenementsResponsabilite?: string;
  detailsProcedureCollective?: string;
  garantieReprisePasse?: boolean;

  sansActiviteDepuisPlusDe12MoisSansFermeture?: string;
  tempsSansActivite?: string;
}

export interface Quote {
  id: string;
  reference: string;
  status: string;
  companyData: CompanyData;
  formData: FormData;
  product: {
    name: string;
    code: string;
    stepConfig?: any;
    formFields?: any;
    requiredDocs?: any;
  };
  broker?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Types pour le système de suivi des paiements
export interface User {
  id: string;
  name?: string;
  email: string;
  role: "BROKER" | "ADMIN" | "UNDERWRITER";
}

export interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountHT: number;
  taxAmount: number;
  amountTTC: number;
  rcdAmount?: number;
  pjAmount?: number;
  feesAmount?: number;
  resumeAmount?: number;
  periodStart: string;
  periodEnd: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "PARTIALLY_PAID";
  paidAt?: string;
  paidAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  adminNotes?: string;
  brokerNotes?: string;
  validatedBy?: User;
  validatedAt?: string;
}

export interface PaymentSchedule {
  id: string;
  totalAmountHT: number;
  totalTaxAmount: number;
  totalAmountTTC: number;
  startDate: string;
  endDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "PARTIALLY_PAID";
  payments: PaymentInstallment[];
}

export interface PaymentForm {
  amount: string;
  method: string;
  reference: string;
  notes: string;
}

// Types pour les documents de devis
export interface QuoteDocument {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  isVerified: boolean;
  validationNotes?: string;
  validatedAt?: string;
  validatedBy?: User;
  uploadedAt: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  data?: {
    fileName: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    publicUrl: string;
  };
  error?: string;
}

// Document requests for additional documents
export interface DocumentRequest {
  id: string;
  documentType: string;
  description?: string;
  isRequired: boolean;
  requestedBy: User;
  requestedAt: string;
  isFulfilled: boolean;
  fulfilledAt?: string;
  fulfilledByDocument?: QuoteDocument;
  adminNotes?: string;
  brokerNotes?: string;
}
