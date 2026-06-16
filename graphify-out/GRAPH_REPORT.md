# Graph Report - .  (2026-06-16)

## Corpus Check
- Large corpus: 433 files · ~1,189,970 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 912 nodes · 1843 edges · 70 communities (55 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]

## God Nodes (most connected - your core abstractions)
1. `handleApiError()` - 91 edges
2. `withAuth()` - 75 edges
3. `withAuthAndRole()` - 44 edges
4. `createApiResponse()` - 33 edges
5. `ApiError` - 32 edges
6. `Quote` - 30 edges
7. `CalculationResult` - 20 edges
8. `getTaxeByRegion()` - 18 edges
9. `genererEcheancier()` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `getPolicesV2()`  [EXTRACTED]
  scripts/compare-bordereau-jan.ts → src/lib/bordereau/extractPolicesV2.ts
- `GET()` --calls--> `withAuthAndRole()`  [INFERRED]
  src/app/api/admin/bordereaux/[id]/download/route.ts → src/lib/api-utils.ts
- `POST()` --calls--> `withAuthAndRole()`  [EXTRACTED]
  src/app/api/admin/bordereaux/export-v2/route.ts → src/lib/api-utils.ts
- `POST()` --calls--> `withAuthAndRole()`  [EXTRACTED]
  src/app/api/admin/bordereaux/preview-v2/route.ts → src/lib/api-utils.ts
- `GET()` --calls--> `withAuthAndRole()`  [EXTRACTED]
  src/app/api/admin/run-echeancier-tests/route.ts → src/lib/api-utils.ts

## Import Cycles
- None detected.

## Communities (70 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (29): GET(), POST(), GET(), GET(), PATCH(), POST(), GET(), POST() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (34): GET(), assureursDefaillants, calculateMajorations(), calculDeg(), calculerMontantsEcheance(), CalculParamsAnnuels, calculPrimeRCD(), calculReprisePasseRCD() (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (30): workflowApi, useWorkflowStore, WorkflowStore, CreateStepMessageData, CreateWorkflowStepData, InputType, MessageType, STEP_TEMPLATES (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (18): POST(), GET(), GET(), prisma, POST(), withAuthAndRole(), globalForPrisma, PATCH() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (29): buildBaseResult(), createMissingInstallment(), CsvRow, csvRowKey(), detectPaymentMethod(), extractSiren(), findInstallmentBySiretAndPeriod(), findInstallmentForCsvRow() (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (15): ClientScreen(), ClientScreenProps, Message, Project, authClient, PaymentSchedule, CONTRACT_STATUSES, EditableColumn (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (8): { GET, POST }, auth, Session, CreateInsuranceProductSchema, prisma, prisma, config, prisma

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (24): csvToBlob(), csvToUtf8Buffer(), downloadCSV(), escapeCsvValue(), generateCSV(), generateCSVFromHeaders(), generateFileName(), generatePolicesCSV() (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (28): ApiResponse, ApiResponseSchema, ContractFilters, ContractFiltersSchema, CreateCommission, CreateCommissionSchema, CreateContract, CreateContractSchema (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (22): adaptEcheancesForDatabase(), GeneratedEcheance, PaymentInfo, prisma, regenerateScheduleWithPaymentPreservation(), restorePaymentInfoAfterRegeneration(), savePaymentInfoBeforeRegeneration(), CalculatedPremium (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (23): activiteMap, BordereauTab(), computePolicesRows(), computeQuittancesRows(), CONTRACT_STATUS, ContractData, EditType, fmtDate() (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (17): DELETE(), GET(), PUT(), GET(), POST(), POST(), createEmailTransporter(), EmailType (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (23): dependencies, archiver, bcryptjs, better-auth, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, lucide-react (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.21
Nodes (15): BordereauMonthEventType, getApporteur(), transformQuoteToFidelidadeRow(), transformToFidelidadeRow(), computeTauxTaxe(), getQuittancesV2(), mapInstallmentToQuittancesRow(), flattenToSourceData() (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (17): activiteCodeToTitle, BordereauInclusionOptions, buildActivityColumnsFromFormData(), buildEtatPoliceByQuote(), getActiviteTitleByCode(), getFormDataFieldsForPolices(), getPolicesV2(), mapInstallmentToPolicesRow() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (9): PATCH(), GET(), ApiError, createApiResponse(), POST(), POST(), POST(), POST() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (15): Row, ActivityTab, AdminScreenProps, BordereauxPage, EXAMPLE_QUOTE_JSON, ImportPaymentsPage, Majorations, RcdFormInput (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (16): appendResiliationMonthEvents(), BORDEREAU_ACTIVE_QUOTE_STATUSES, BordereauMonthEvent, endOfResiliationMonth(), EVENT_TYPE_SORT_ORDER, expandMonthEvents(), filterPostResiliation(), getBordereauMonthEvents() (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (10): EDITABLE_SECTIONS, SimpleParameterEditorProps, CalculationResult, QuoteDocument, AggravationTab(), BrokerCommissionsTabProps, Echeance, DOCUMENT_CHECKLIST (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (7): calculateWithMapping(), getBrokerCode(), getBrokerInfo(), QuoteSuccessPageProps, FormDataTabProps, FRENCH_LABELS, getTaxeProtectionJuridiqueByRegion()

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (11): POLICES_COLUMNS, QUITTANCES_COLUMNS, BordereauxPage(), defaultYear, EditableTableProps, getYears(), GroupedPolicesTableProps, HistoryItem (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (11): ModificationForm, buildGetEcheanceRowValues(), computeRowValuesDefault(), computeRowValuesModifieAlaMain(), EcheanceRowValues, PaymentInstallmentForEcheanceRow, baseInst, EcheanceAvecOrigIndex (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.21
Nodes (12): getBordereauData(), TransformParams, TransformQuoteParams, ActivityData, BordereauDataResult, BordereauFilters, FidelidadeRow, SourceDataItem (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.19
Nodes (10): ActivityShare, CompanyData, DocumentRequest, DocumentUploadResponse, PaymentForm, PaymentInstallment, User, DOCUMENT_TYPES (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (8): FieldDraft, FormField, ProductConfigTabProps, SortableFieldProps, StepConfig, StepWithSortableFieldsProps, LossHistoryField(), LossHistoryFieldProps

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (10): AdminScreen(), MessageComposer(), MessageComposerProps, getStatusLabel(), DirectMessage, MessagesState, useMessagesStore, User (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (9): ACTION_LABELS, getYears(), ImportAction, ImportPaymentsPage(), ImportResponse, ImportResult, ImportStats, MOIS (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.19
Nodes (8): applyCalculationChange(), ContractRCDPDF(), ContractRCDPDFProps, styles, LetterOfIntentPDFProps, styles, getTaxeByRegion(), tableauTax

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (8): sendEmailWithAttachment(), getAttestationTemplate(), POST(), POST(), getLetterIntentTemplate(), POST(), POST(), POST()

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (7): FormData, Quote, AttestationRCDPDFProps, styles, OfferLetterPDFProps, styles, OfferLetterPreviewProps

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, @eslint/eslintrc, tailwindcss, @tailwindcss/postcss, tsx, @types/archiver (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (6): fetchCompanyBySiret(), PappersCompanyData, ActivityBreakdownFieldProps, MultiSelectProps, Option, QuoteFormProps

### Community 33 - "Community 33"
Cohesion: 0.23
Nodes (11): CalculationResult, CONTRACT_STATUSES, createPaymentScheduleFromCalculation(), LOG, main(), parseDate(), parseLine(), prisma (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.24
Nodes (9): BrokerScreen(), BrokerScreenProps, TUTORIAL_VIDEOS, TutorialVideo, QuoteDetailPage(), QuoteForm(), InsuranceProduct, ProductsState (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.27
Nodes (8): buildWhereClause(), createErrorResponse(), generateReference(), validatePagination(), GET(), POST(), GET(), POST()

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (11): scripts, build, db:seed, dev, import-payments, lint, recalcul-echeancier, recalcul-echeancier:last (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (8): QuotesList(), QuotesListProps, QuoteValidationPage(), QuoteValidationPageProps, Quote, QuoteDocument, QuotesState, useQuotesStore

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (6): AppelDePrimeTab(), fmtDate(), LocalInstallment, PAYMENT_METHOD_LABELS, QUOTE_STATUS_LABELS, STATUS_LABELS

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (3): PARAMETER_CATEGORIES, ParameterEditorProps, recalculateWithParams()

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (5): formatDate(), main(), prisma, Reason, REFERENCES_A_VERIFIER

### Community 41 - "Community 41"
Cohesion: 0.47
Nodes (4): QuoteChatState, QuoteMessage, useQuoteChatStore, ChatTab()

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 43 - "Community 43"
Cohesion: 0.50
Nodes (3): computeEndDate(), getContractDurationYears(), POST()

### Community 44 - "Community 44"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (4): ApproveOfferModal(), ApproveOfferModalProps, getQuoteDateEffet(), QuoteForModal

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (4): formatNumber(), PremiumCallPDF(), PremiumCallPDFProps, styles

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (4): formatDate(), main(), prisma, REFS_A_METTRE_ACCEPTED

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **293 isolated node(s):** `__filename`, `__dirname`, `compat`, `eslintConfig`, `nextConfig` (+288 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getTaxeByRegion()` connect `Community 28` to `Community 1`, `Community 9`, `Community 10`, `Community 13`, `Community 20`, `Community 22`, `Community 25`, `Community 30`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `auth` connect `Community 6` to `Community 35`, `Community 5`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `withAuth()` connect `Community 0` to `Community 3`, `Community 35`, `Community 11`, `Community 15`, `Community 49`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `handleApiError()` (e.g. with `PUT()` and `DELETE()`) actually correct?**
  _`handleApiError()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `withAuth()` (e.g. with `PUT()` and `DELETE()`) actually correct?**
  _`withAuth()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `withAuthAndRole()` (e.g. with `POST()` and `GET()`) actually correct?**
  _`withAuthAndRole()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `__filename`, `__dirname`, `compat` to the rest of the system?**
  _293 weakly-connected nodes found - possible documentation gaps or missing edges._