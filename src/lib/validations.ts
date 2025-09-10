import { z } from "zod";

// Common validations
export const IdSchema = z.string().cuid();

// Insurance Product schemas
export const InsuranceProductSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  code: z.string().min(1, "Le code produit est requis").max(10),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  formFields: z.record(z.string(), z.any()), // JSON configuration
  pricingRules: z.record(z.string(), z.any()), // JSON configuration
  requiredDocs: z.array(z.string()),
  workflowConfig: z.record(z.string(), z.any()).optional(),
});

export const CreateInsuranceProductSchema = InsuranceProductSchema;

// Quote schemas
export const QuoteCompanyDataSchema = z.object({
  companyName: z.string().min(1, "Raison sociale requise"),
  siret: z.string().min(14, "SIRET invalide").max(14),
  address: z.string().min(1, "Adresse requise"),
  legalForm: z.string().optional(),
  creationDate: z.string().optional(),
});

export const CreateQuoteSchema = z.object({
  productId: IdSchema,
  companyData: QuoteCompanyDataSchema,
  formData: z.record(z.string(), z.any()), // Dynamic form data based on product
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "INCOMPLETE",
      "IN_PROGRESS",
      "COMPLEMENT_REQUIRED",
      "OFFER_READY",
      "OFFER_SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
    ])
    .default("INCOMPLETE"),
});

export const UpdateQuoteSchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "IN_PROGRESS",
      "COMPLEMENT_REQUIRED",
      "OFFER_READY",
      "OFFER_SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "INCOMPLETE",
    ])
    .optional(),
  formData: z.record(z.string(), z.any()).optional(),
  companyData: z.record(z.string(), z.any()).optional(),
  calculatedPremium: z.number().positive().optional(),
  validUntil: z.string().optional(),
});

// Contract schemas
export const CreateContractSchema = z.object({
  quoteId: IdSchema,
  startDate: z.string(),
  endDate: z.string(),
  annualPremium: z.number().positive(),
});

export const UpdateContractSchema = z.object({
  status: z
    .enum(["ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED", "PENDING_RENEWAL"])
    .optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "OVERDUE", "DISPUTED"]).optional(),
  renewalDate: z.string().optional(),
  isAutoRenewal: z.boolean().optional(),
});

// Document upload schema
export const DocumentUploadSchema = z.object({
  documentType: z.enum([
    "KBIS",
    "FINANCIAL_STATEMENT",
    "INSURANCE_CERTIFICATE",
    "SIGNED_QUOTE",
    "CONTRACT",
    "ATTESTATION",
    "OTHER",
  ]),
  relatedEntityId: IdSchema,
  relatedEntityType: z.enum(["quote", "contract"]),
});

// Commission schemas
export const CreateCommissionSchema = z.object({
  contractId: IdSchema,
  basePremium: z.number().positive(),
  commissionRate: z.number().min(0).max(100),
  dueDate: z.string(),
});

// Notification schemas
export const CreateNotificationSchema = z.object({
  type: z.enum([
    "CONTRACT_EXPIRATION",
    "PAYMENT_DUE",
    "OFFER_READY",
    "COMPLEMENT_REQUIRED",
    "RENEWAL_DUE",
    "GENERAL",
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: IdSchema,
  isUrgent: z.boolean().default(false),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  scheduledFor: z.string().optional(),
});

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Filter schemas
export const QuoteFiltersSchema = z.object({
  status: z.string().optional(),
  productId: z.string().optional(),
  brokerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const ContractFiltersSchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  brokerId: z.string().optional(),
  expiringBefore: z.string().optional(),
});

// Type exports
export type InsuranceProduct = z.infer<typeof InsuranceProductSchema>;
export type CreateInsuranceProduct = z.infer<
  typeof CreateInsuranceProductSchema
>;
export type QuoteCompanyData = z.infer<typeof QuoteCompanyDataSchema>;
export type CreateQuote = z.infer<typeof CreateQuoteSchema>;
export type UpdateQuote = z.infer<typeof UpdateQuoteSchema>;
export type CreateContract = z.infer<typeof CreateContractSchema>;
export type UpdateContract = z.infer<typeof UpdateContractSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type CreateCommission = z.infer<typeof CreateCommissionSchema>;
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type QuoteFilters = z.infer<typeof QuoteFiltersSchema>;
export type ContractFilters = z.infer<typeof ContractFiltersSchema>;
