# Graph Report - src  (2026-06-16)

## Corpus Check
- 181 files · ~182,820 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 847 nodes · 1785 edges · 57 communities (44 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e8e57ded`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]

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
10. `calculateWithMapping()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `withAuthAndRole()`  [INFERRED]
  app/api/admin/bordereaux/[id]/download/route.ts → lib/api-utils.ts
- `POST()` --calls--> `withAuthAndRole()`  [INFERRED]
  app/api/brokers/route.ts → lib/api-utils.ts
- `POST()` --calls--> `withAuthAndRole()`  [EXTRACTED]
  app/api/admin/bordereaux/export-v2/route.ts → lib/api-utils.ts
- `POST()` --calls--> `withAuthAndRole()`  [EXTRACTED]
  app/api/admin/bordereaux/preview-v2/route.ts → lib/api-utils.ts
- `GET()` --calls--> `withAuthAndRole()`  [EXTRACTED]
  app/api/admin/run-echeancier-tests/route.ts → lib/api-utils.ts

## Import Cycles
- None detected.

## Communities (57 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (35): PUT(), DELETE(), GET(), PUT(), GET(), GET(), GET(), GET() (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (37): workflowApi, authClient, ApproveOfferModal(), ApproveOfferModalProps, getQuoteDateEffet(), QuoteForModal, useWorkflowStore, WorkflowStore (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (35): ContractRCDPDF(), GET(), assureursDefaillants, calculateMajorations(), calculDeg(), calculerMontantsEcheance(), CalculParamsAnnuels, calculPrimeRCD() (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (19): DELETE(), GET(), PUT(), GET(), prisma, POST(), ApiError, createApiResponse() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (25): getBordereauData(), TransformParams, TransformQuoteParams, transformQuoteToFidelidadeRow(), transformToFidelidadeRow(), computeTauxTaxe(), mapInstallmentToQuittancesRow(), ActivityData (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (29): buildBaseResult(), createMissingInstallment(), CsvRow, csvRowKey(), detectPaymentMethod(), extractSiren(), findInstallmentBySiretAndPeriod(), findInstallmentForCsvRow() (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (24): GET(), csvToBlob(), csvToUtf8Buffer(), downloadCSV(), escapeCsvValue(), generateCSV(), generateCSVFromHeaders(), generateFileName() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (24): ApiResponse, ApiResponseSchema, ContractFilters, ContractFiltersSchema, CreateCommission, CreateCommissionSchema, CreateContract, CreateContractSchema (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (18): POST(), createEmailTransporter(), EmailType, getBrokerInvitationTemplate(), getPasswordResetTemplate(), logEmail(), LogEmailParams, sendEmail() (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (22): adaptEcheancesForDatabase(), GeneratedEcheance, PaymentInfo, prisma, regenerateScheduleWithPaymentPreservation(), restorePaymentInfoAfterRegeneration(), savePaymentInfoBeforeRegeneration(), CalculatedPremium (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (23): activiteMap, BordereauTab(), computePolicesRows(), computeQuittancesRows(), CONTRACT_STATUS, ContractData, EditType, fmtDate() (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (12): applyCalculationChange(), calculateWithMapping(), getBrokerCode(), getBrokerInfo(), ContractRCDPDFProps, styles, LetterOfIntentPDFProps, styles (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (17): CorrespondanceTabProps, EmailLog, Row, ActivityTab, AdminScreenProps, BordereauxPage, EXAMPLE_QUOTE_JSON, ImportPaymentsPage (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (16): BordereauMonthEventType, getApporteur(), activiteCodeToTitle, BordereauInclusionOptions, buildActivityColumnsFromFormData(), buildEtatPoliceByQuote(), getActiviteTitleByCode(), getFormDataFieldsForPolices() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (13): ActivityShare, CompanyData, DocumentRequest, DocumentUploadResponse, PaymentForm, PaymentInstallment, PaymentSchedule, User (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (19): **Activités garanties**, **CLAUSES SPECIALES :**, **Conformément aux dispositions du présent contrat, il est convenu qu’en cas de non-paiement de la prime d’assurance à(aux)**, **CP Ville :**, **Dans le cas où les travaux réalisés ne répondent pas aux caractéristiques énoncées ci-dessus, l’assuré en informe l’assureur**., **Durée et maintien de la garantie :**, **ENCYCLIE CONSTRUCTION, 42 RUE NOTRE-DAME DES VICTOIRES 75002 PARIS**, **Fait à Paris, le xx/xx/xxx** (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (5): { GET, POST }, auth, Session, prisma, prisma

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (16): appendResiliationMonthEvents(), BORDEREAU_ACTIVE_QUOTE_STATUSES, BordereauMonthEvent, endOfResiliationMonth(), EVENT_TYPE_SORT_ORDER, expandMonthEvents(), filterPostResiliation(), getBordereauMonthEvents() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (10): EDITABLE_SECTIONS, SimpleParameterEditorProps, CalculationResult, QuoteDocument, AggravationTab(), BrokerCommissionsTabProps, Echeance, DOCUMENT_CHECKLIST (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (11): POLICES_COLUMNS, QUITTANCES_COLUMNS, BordereauxPage(), defaultYear, EditableTableProps, getYears(), GroupedPolicesTableProps, HistoryItem (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (11): ModificationForm, buildGetEcheanceRowValues(), computeRowValuesDefault(), computeRowValuesModifieAlaMain(), EcheanceRowValues, PaymentInstallmentForEcheanceRow, baseInst, EcheanceAvecOrigIndex (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (8): PARAMETER_CATEGORIES, ParameterEditorProps, recalculateWithParams(), FormData, Quote, OfferLetterPDFProps, styles, OfferLetterPreviewProps

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (12): POST(), buildWhereClause(), createErrorResponse(), generateReference(), validatePagination(), CreateQuoteSchema, PaginationSchema, QuoteFiltersSchema (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (6): POST(), PATCH(), POST(), globalForPrisma, POST(), POST()

### Community 25 - "Community 25"
Cohesion: 0.19
Nodes (10): AdminScreen(), MessageComposer(), MessageComposerProps, config, DirectMessage, MessagesState, useMessagesStore, User (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (7): FieldDraft, FormField, ProductConfigTabProps, SortableFieldProps, StepConfig, StepWithSortableFieldsProps, ActivityBreakdownFieldProps

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (9): ACTION_LABELS, getYears(), ImportAction, ImportPaymentsPage(), ImportResponse, ImportResult, ImportStats, MOIS (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (7): fetchCompanyBySiret(), PappersCompanyData, LossHistoryField(), LossHistoryFieldProps, MultiSelectProps, Option, QuoteFormProps

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (9): CONTRACT_STATUSES, EditableColumn, formatCreatedAt(), getQuoteCompanyName(), getQuoteSearchableText(), getQuoteSiret(), ModifierEcheancierPage(), QUOTE_STATUSES (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (9): QuotesList(), QuotesListProps, QuoteValidationPage(), QuoteValidationPageProps, getStatusLabel(), Quote, QuoteDocument, QuotesState (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.23
Nodes (11): CalculationResult, CONTRACT_STATUSES, createPaymentScheduleFromCalculation(), LOG, main(), parseDate(), parseLine(), prisma (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.24
Nodes (9): BrokerScreen(), BrokerScreenProps, TUTORIAL_VIDEOS, TutorialVideo, QuoteDetailPage(), QuoteForm(), InsuranceProduct, ProductsState (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (6): AppelDePrimeTab(), fmtDate(), LocalInstallment, PAYMENT_METHOD_LABELS, QUOTE_STATUS_LABELS, STATUS_LABELS

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (4): DELETE(), GET(), PUT(), UpdateQuoteSchema

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (4): ClientScreen(), ClientScreenProps, Message, Project

### Community 37 - "Community 37"
Cohesion: 0.40
Nodes (5): formatDate(), main(), prisma, Reason, REFERENCES_A_VERIFIER

### Community 38 - "Community 38"
Cohesion: 0.47
Nodes (4): QuoteChatState, QuoteMessage, useQuoteChatStore, ChatTab()

### Community 39 - "Community 39"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 40 - "Community 40"
Cohesion: 0.50
Nodes (3): computeEndDate(), getContractDurationYears(), POST()

### Community 41 - "Community 41"
Cohesion: 0.50
Nodes (4): formatNumber(), PremiumCallPDF(), PremiumCallPDFProps, styles

### Community 42 - "Community 42"
Cohesion: 0.50
Nodes (4): formatDate(), main(), prisma, REFS_A_METTRE_ACCEPTED

## Knowledge Gaps
- **238 isolated node(s):** `TabId`, `MOIS`, `HistoryItem`, `EditableTableProps`, `GroupedPolicesTableProps` (+233 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `auth` connect `Community 16` to `Community 32`, `Community 7`, `Community 22`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `getTaxeByRegion()` connect `Community 11` to `Community 2`, `Community 4`, `Community 9`, `Community 10`, `Community 20`, `Community 21`, `Community 26`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `withAuth()` connect `Community 0` to `Community 3`, `Community 35`, `Community 23`, `Community 54`, `Community 22`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `handleApiError()` (e.g. with `PUT()` and `DELETE()`) actually correct?**
  _`handleApiError()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `withAuth()` (e.g. with `PUT()` and `DELETE()`) actually correct?**
  _`withAuth()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `withAuthAndRole()` (e.g. with `GET()` and `DELETE()`) actually correct?**
  _`withAuthAndRole()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TabId`, `MOIS`, `HistoryItem` to the rest of the system?**
  _238 weakly-connected nodes found - possible documentation gaps or missing edges._