# Epic: Bordereau FIDELIDADE Generation - Brownfield Enhancement

## Epic Goal

Enable admins to automatically generate **two** bordereau CSV files for FIDELIDADE (polices + quittances) from a **period** filter only, with correct mapping from system data and audit trail. No broker selection: APPORTEUR is a single configurable constant.

## Epic Description

### Existing System Context

**Current relevant functionality:**
- Insurance quote management system (RC Décennale) with Quote, InsuranceContract, and BrokerProfile entities
- Premium calculation engine (`calculPrimeRCD`) generating detailed pricing with payment schedules
- Admin dashboard for managing quotes and contracts
- Data stored in PostgreSQL via Prisma ORM

**Technology stack:**
- Next.js 15.4.8 with React 19
- Prisma ORM with PostgreSQL
- TypeScript
- Existing CSV export library (@react-pdf/renderer suggests document generation capabilities)

**Integration points:**
- Quote model (formData, companyData, calculatedPremium)
- InsuranceContract model (dates, status)
- BrokerProfile model (broker code)
- Payment schedule from `calculPrimeRCD` function

### Enhancement Details

**What's being added/changed:**

1. **Database Schema Extensions:**
   - New `Bordereau` table for audit trail/history
   - Add `codeNAF` field to Quote/company data
   - IDENTIFIANT_POLICE = Quote.reference (pas de champ dédié)

2. **Admin UI - Bordereau Generation Module:**
   - Filter: **period only** (date range). No broker selection; APPORTEUR = configurable constant.
   - Data preview for both sheets (polices + quittances) with edit capability for correction.
   - **Two CSV exports** (polices CSV + quittances CSV).
   - Historical bordereau listing with re-download capability.

3. **Data Transformation Engine:**
   - **Feuille 1 (Polices):** Contrats + quotes with status ACCEPTED; one row per policy; 8 pairs LIBELLÉ_ACTIVITÉ / POIDS_ACTIVITÉ; APPORTEUR = constant.
   - **Feuille 2 (Quittances):** One row per échéance (PaymentInstallment) in period; IDENTIFIANT_QUITTANCE = IDENTIFIANT_POLICE + "Q" + numéro d’échéance (Q1, Q2…); GARANTIE = "RC_RCD"; APPORTEUR = same constant.
   - Exhaustive mapping so all columns are correctly filled from system data; handle missing data with documented defaults.

**How it integrates:**
- Reads from existing Quote, InsuranceContract, BrokerProfile tables
- Leverages existing `calculPrimeRCD` results for payment schedules
- Admin-only feature using existing authentication/authorization
- New API routes under `/api/admin/bordereaux`
- New admin UI pages under `/app/admin/bordereaux`

**Success criteria:**
- Admins generate **two** FIDELIDADE CSV files (polices + quittances) in < 30 seconds from a **period** only.
- All columns of both CSVs populated correctly from system data (mapping exhaustif; pas de champs vides ou incorrects sans raison documentée).
- 100% of generated bordereaux saved with full audit trail.
- No broker filter in UI; APPORTEUR always the same configurable value.
- Edit capability in preview for manual correction when needed.

## Stories

**Nouvelles stories (scope clarifié — février 2025) :** Les stories v2 remplacent les stories 1–5 pour le bordereau FIDELIDADE (deux CSV, pas de filtre courtier, APPORTEUR constante). Référence : `docs/epics/bordereau-fidelidade-scope-clarifie.md`.

| Story | Fichier | Titre |
|-------|---------|--------|
| v2.1 | bordereau-fidelidade-v2.1.schema-apporteur.md | Schéma Bordereau, identifiant police, constante APPORTEUR |
| v2.2 | bordereau-fidelidade-v2.2.extraction-polices.md | Service extraction Feuille 1 Polices |
| v2.3 | bordereau-fidelidade-v2.3.extraction-quittances.md | Service extraction Feuille 2 Quittances |
| v2.4 | bordereau-fidelidade-v2.4.generation-export-deux-csv.md | Génération et export des deux CSV |
| v2.5 | bordereau-fidelidade-v2.5.admin-ui-period-deux-previews.md | Admin UI — Période seule, deux préviews, deux CSV |
| v2.6 | bordereau-fidelidade-v2.6.historique-audit.md | Historique et audit des bordereaux |

**Stories 1–5 (anciennes)** : Superseded by v2.1–v2.6. L’implémentation existante (stories 2, 3, 4) repose sur l’ancien scope (un CSV, filtre courtiers) ; à adapter ou remplacer selon les stories v2.

---

### Story 1 (ancienne): Database Schema & Data Model
**Title:** Add Bordereau schema and extend Quote/Contract models for FIDELIDADE data

**Description:** Extend Prisma schema to support bordereau generation with audit trail, CODE_NAF tracking, and police identifier generation.

**Acceptance Criteria:**
1. `Bordereau` model created with fields: id, generatedBy, generatedAt, periodStart, periodEnd, filterCriteria (JSON), csvData (JSON), fileName, filePath
2. `codeNAF` field added to Quote model (companyData JSON or direct field)
3. IDENTIFIANT_POLICE = Quote.reference (champ existant ; pas de nouveau champ)
4. Migration scripts created and tested
5. Seed data updated to include sample CODE_NAF values

### Story 2: Bordereau Data Extraction & Transformation Service
**Title:** Build service to extract and transform data into FIDELIDADE format (polices + quittances)

**Description:** Create backend service that queries contracts and quotes (ACCEPTED), and PaymentInstallments in period; outputs two datasets: polices (one row per policy) and quittances (one row per échéance).

**Acceptance Criteria:**
1. Service accepts **period only** (dateRange). No brokerIds; APPORTEUR = configurable constant (env or config).
2. **Feuille 1 (Polices):** Contrats + quotes with status ACCEPTED in scope; one row per policy; APPORTEUR constant; IDENTIFIANT_POLICE = Quote.reference; 8 pairs LIBELLÉ_ACTIVITÉ / POIDS_ACTIVITÉ; all polices columns mapped from Quote/Contract/companyData/formData.
3. **Feuille 2 (Quittances):** One row per PaymentInstallment whose dueDate (or period) falls in date range; APPORTEUR same constant; IDENTIFIANT_QUITTANCE = IDENTIFIANT_POLICE + "Q" + installmentNumber (Q1, Q2…); GARANTIE = "RC_RCD"; PRIME_TTC/HT, TAXES, TAUX_COMMISSIONS, COMMISSIONS, MODE_PAIEMENT from installment/quote.
4. Handles missing data with documented defaults (e.g. empty for avenant).
5. Returns two structured arrays (polices rows + quittances rows) ready for CSV conversion.
6. Unit tests cover mapping for both sheets.

### Story 3: CSV Generation & Export Functionality
**Title:** Implement **two** CSV files generation and download (polices + quittances)

**Description:** Create CSV utilities that convert the two transformed datasets to FIDELIDADE format and enable download of **two** files (or a ZIP containing both).

**Acceptance Criteria:**
1. Two CSV utilities (or one with two modes): polices CSV and quittances CSV, each with exact column structure matching FIDELIDADE spec.
2. Proper CSV escaping for special characters in text fields.
3. File naming: e.g. `BORDEREAU_FIDELIDADE_POLICES_[MONTH]_[YEAR].csv` and `BORDEREAU_FIDELIDADE_QUITTANCES_[MONTH]_[YEAR].csv` (or ZIP with both).
4. Download via API returns both files (e.g. ZIP or two separate downloads).
5. Generated CSVs validated against FIDELIDADE structure (column names and count).

### Story 4: Admin UI - Filter & Preview Interface
**Title:** Build admin interface for bordereau (period filter only, two previews, two CSVs)

**Description:** Create admin page with **period filter only** (no broker selection), preview for polices and quittances, and generation of **two** CSV files.

**Acceptance Criteria:**
1. Admin navigation includes "Bordereaux" section.
2. Filter form: **period only** (date range start/end). **No broker dropdown.** Optionally contract status / product type if needed for scope.
3. "Prévisualiser" fetches polices + quittances for the period (quotes ACCEPTED + contrats; échéances in period).
4. Preview: two tables (or two onglets) — polices (one row per policy) and quittances (one row per échéance). All columns displayed; cells editable for correction.
5. Edit state persisted until "Générer CSV" or reset.
6. "Générer CSV" triggers download of **two** CSV files (or one ZIP). APPORTEUR constant applied; no broker selection.
7. Loading states and error handling.

### Story 5: Bordereau History & Audit Trail
**Title:** Implement bordereau generation history with re-generation capability

**Description:** Save all generated bordereaux to database with audit trail and enable viewing/re-downloading historical files.

**Acceptance Criteria:**
1. On CSV generation, save Bordereau record to database:
   - generatedBy (current admin user ID)
   - generatedAt (timestamp)
   - filterCriteria (JSON of applied filters)
   - csvData (JSON of final exported data)
   - fileName, filePath (if storing files)
2. History page lists all bordereaux with:
   - Generation date/time
   - Generated by (admin name)
   - Period covered
   - Number of polices / number of quittances
   - Download button (both CSVs or ZIP)
3. Re-download capability fetches saved data (both polices + quittances CSVs)
4. Optional: Re-generation with same filters button
5. Pagination for large history lists (20 per page)

## Compatibility Requirements

- [x] Existing APIs remain unchanged (new routes only)
- [x] Database schema changes are backward compatible (additive only)
- [x] UI changes follow existing admin patterns (Next.js app router structure)
- [x] Performance impact is minimal (async CSV generation for large datasets)

## Risk Mitigation

**Primary Risk:** Data mapping errors could produce incorrect bordereau data, causing financial/regulatory issues with FIDELIDADE

**Mitigation:**
- Comprehensive unit tests for all data transformations
- Manual validation step: admin reviews preview before export
- Sample file validation against known-good FIDELIDADE CSV
- Audit trail enables tracing any data issues back to source

**Secondary Risk:** Large datasets could cause timeout/memory issues during CSV generation

**Mitigation:**
- Implement pagination/chunking for datasets > 1000 contracts
- Consider background job processing for very large exports
- Add progress indicator for long-running operations

**Rollback Plan:**
- Database migrations are reversible (down migrations)
- New features behind admin auth, no impact on broker/client flows
- Can disable feature via feature flag if critical issues arise
- Manual CSV generation process remains available as fallback

## Definition of Done

- [x] All 5 stories completed with acceptance criteria met
- [x] Existing quote/contract functionality verified through regression testing
- [x] Integration points (Quote, Contract, BrokerProfile) working correctly
- [x] Admin can generate sample bordereau matching FIDELIDADE format
- [x] Documentation updated (API docs, admin user guide)
- [x] No regression in existing features confirmed by QA

## Technical Notes

**Scope clarifié:** Voir `docs/epics/bordereau-fidelidade-scope-clarifie.md`.

**Feuille 1 — Polices (one row per policy):**
- APPORTEUR: **configurable constant** (env/config), same for all rows.
- IDENTIFIANT_POLICE: Quote.reference (champ existant).
- Source: contrats + quotes with status ACCEPTED. Dates, SIREN, CA, effectif, CODE_NAF, adresse, NOM_ENTREPRISE_ASSURE, TYPE_CONTRAT, COMPAGNIE, STATUT_POLICE, etc. from Quote/Contract/companyData/formData.
- LIBELLÉ_ACTIVITÉ / POIDS_ACTIVITÉ: **8 pairs** from formData.activites (codes 1–20, caSharePercent).
- Avenant fields: empty for now.

**Feuille 2 — Quittances (one row per échéance):**
- APPORTEUR: same constant.
- IDENTIFIANT_POLICE: Quote.reference.
- IDENTIFIANT_QUITTANCE: **IDENTIFIANT_POLICE + "Q" + installmentNumber** (e.g. Q1, Q2, Q3, Q4).
- DATE_EFFET_QUITTANCE / DATE_FIN_QUITTANCE: PaymentInstallment.periodStart / periodEnd.
- DATE_EMISSION_QUITTANCE, DATE_ENCAISSEMENT: from installment/quote.
- PRIME_TTC, PRIME_HT, TAXES: PaymentInstallment.amountTTC, amountHT, taxAmount.
- TAUX_COMMISSIONS, COMMISSIONS: from quote/broker config or calculatedPremium.
- GARANTIE: **"RC_RCD"** (fixed). MODE_PAIEMENT: PaymentInstallment.paymentMethod.

**Edge Cases:**
- Polices: < 8 activities → empty for unused LIBELLÉ/POIDS; avenant → empty.
- Quittances: only installments whose dueDate (or period) falls in selected period.

## Story Manager Handoff

**Story Manager Handoff:**

Please develop detailed user stories following the structure outlined above. Key considerations:

- This is an enhancement to an existing Next.js 15.4.8 insurance platform with Prisma/PostgreSQL
- Integration points: Quote (formData, companyData), InsuranceContract, BrokerProfile, `calculPrimeRCD` function
- Existing patterns to follow: Next.js App Router, Prisma models, admin-only features behind auth
- Critical compatibility requirements: All schema changes must be additive (backward compatible), no changes to existing APIs
- Each story must include verification that existing quote/contract functionality remains intact
- Data accuracy is paramount - include comprehensive validation and testing requirements

The epic should maintain system integrity while delivering automated bordereau generation for FIDELIDADE compliance.

**Estimated Story Points:** 21 points (Story 1: 3pt, Story 2: 8pt, Story 3: 3pt, Story 4: 5pt, Story 5: 2pt)

**Dependencies:**
- Access to FIDELIDADE CSV format specification (sample file provided)
- Admin user requirements for UI/UX preferences
- Confirmation of CODE_NAF source (manual entry vs. external API)

---

*Epic created by: Sarah (Product Owner)*
*Date: 2025-01-30*
*Based on requirements gathered by: Mary (Business Analyst)*
