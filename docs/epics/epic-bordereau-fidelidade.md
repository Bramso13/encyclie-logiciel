# Epic: Bordereau FIDELIDADE Generation - Brownfield Enhancement

## Epic Goal

Enable admins to automatically generate monthly bordereau CSV files for FIDELIDADE insurer and brokers, replacing the current manual process and providing comprehensive filtering, editing, and audit trail capabilities.

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
   - Add `identifiantPolice` field (format: ANNÉE+NUMÉRO+RCDFID)

2. **Admin UI - Bordereau Generation Module:**
   - Filter interface (date range, broker, contract status, product type)
   - Data preview table with full edit capability (all 36 CSV columns)
   - CSV export functionality
   - Historical bordereau listing with re-generation capability

3. **Data Transformation Engine:**
   - Map Quote/Contract data to FIDELIDADE CSV format (36 columns)
   - Support for multiple activities per contract (up to 8 with codes 1-20)
   - Date filtering by payment schedule (échéance date)
   - Handle partial data scenarios gracefully

**How it integrates:**
- Reads from existing Quote, InsuranceContract, BrokerProfile tables
- Leverages existing `calculPrimeRCD` results for payment schedules
- Admin-only feature using existing authentication/authorization
- New API routes under `/api/admin/bordereaux`
- New admin UI pages under `/app/admin/bordereaux`

**Success criteria:**
- Admins can generate FIDELIDADE bordereau CSV in < 30 seconds
- All 36 required columns populated correctly from system data
- 100% of generated bordereaux saved with full audit trail
- Zero manual data entry required for standard contracts
- Edit capability allows manual override when needed

## Stories

### Story 1: Database Schema & Data Model
**Title:** Add Bordereau schema and extend Quote/Contract models for FIDELIDADE data

**Description:** Extend Prisma schema to support bordereau generation with audit trail, CODE_NAF tracking, and police identifier generation.

**Acceptance Criteria:**
1. `Bordereau` model created with fields: id, generatedBy, generatedAt, periodStart, periodEnd, filterCriteria (JSON), csvData (JSON), fileName, filePath
2. `codeNAF` field added to Quote model (companyData JSON or direct field)
3. `identifiantPolice` field added to Quote/InsuranceContract with auto-generation logic (YYYY+NUMBER+RCDFID)
4. Migration scripts created and tested
5. Seed data updated to include sample CODE_NAF values

### Story 2: Bordereau Data Extraction & Transformation Service
**Title:** Build service to extract and transform contract data into FIDELIDADE CSV format

**Description:** Create backend service that queries contracts, maps data to 36-column FIDELIDADE format, and handles edge cases.

**Acceptance Criteria:**
1. Service accepts filter parameters (dateRange, brokerIds, contractStatus, productType)
2. Queries contracts filtered by payment schedule échéance dates (Option C)
3. Transforms data to 36 FIDELIDADE columns:
   - APPORTEUR from BrokerProfile.code
   - IDENTIFIANT_POLICE from contract
   - Dates from Quote.submittedAt, formData, echéancier
   - SIREN, CA, effectif from companyData
   - Activities (up to 8) from formData with codes 1-20 and weights
   - All other required fields mapped correctly
4. Handles missing data gracefully (empty strings for avenant fields)
5. Returns structured data array ready for CSV conversion
6. Unit tests cover all mapping scenarios

### Story 3: CSV Generation & Export Functionality
**Title:** Implement CSV file generation and download for bordereau data

**Description:** Create CSV generation utility that converts transformed data to FIDELIDADE format and enables download.

**Acceptance Criteria:**
1. CSV utility accepts transformed data array
2. Generates CSV with exact 36-column structure matching FIDELIDADE format
3. Proper CSV escaping for special characters in text fields
4. File naming convention: `BORDEREAU_FIDELIDADE_[MONTH]_[YEAR].csv`
5. Download triggered via API endpoint returns CSV file
6. Generated CSV validated against sample FIDELIDADE file structure

### Story 4: Admin UI - Filter & Preview Interface
**Title:** Build admin interface for bordereau filtering and data preview

**Description:** Create admin page with comprehensive filters and editable preview table before CSV generation.

**Acceptance Criteria:**
1. Admin navigation includes "Bordereaux" section
2. Filter form includes:
   - Date range picker (period start/end)
   - Multi-select broker dropdown
   - Contract status checkboxes (EN COURS, SOUSCRIPTION, etc.)
   - Product type selector
3. "Prévisualiser" button fetches matching contracts
4. Preview table displays all 36 columns
5. All table cells are editable inline (text inputs)
6. Edit state persisted in component until generation/reset
7. "Générer CSV" button triggers download with edited data
8. Loading states and error handling implemented

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
   - Number of contracts
   - Download button
3. Re-download capability fetches saved CSV data
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

**CSV Column Structure (36 columns):**
```
APPORTEUR, IDENTIFIANT_POLICE, DATE_SOUSCRIPTION, DATE_EFFET_CONTRAT,
DATE_FIN_CONTRAT, NUMERO_AVENANT, MOTIF_AVENANT, DATE_EFFET_AVENANT,
DATE_ECHEANCE, ETAT_POLICE, DATE_ETAT_POLICE, MOTIF_ETAT, FRANCTIONNEMENT,
SIREN, ADRESSE_RISQUE, VILLE_RISQUE, CODE_POSTAL_RISQUE, CA_ENTREPRISE,
EFFECTIF_ENTREPRISE, CODE_NAF,
LIBELLE_ACTIVITE (x8), POID_ACTIVITE (x8)
```

**Data Sources:**
- APPORTEUR: `BrokerProfile.code`
- IDENTIFIANT_POLICE: New field (auto-generated)
- DATE_SOUSCRIPTION: `Quote.submittedAt`
- DATE_EFFET_CONTRAT: From `Quote.formData` (admin chooses)
- DATE_FIN_CONTRAT: Admin chooses
- DATE_ECHEANCE: From `calculPrimeRCD().echeancier`
- ETAT_POLICE: Map from `ContractStatus`
- SIREN, CA, effectif: From `Quote.companyData`
- CODE_NAF: New field in Quote
- Activities: From `Quote.formData.activites` (array of {code: 1-20, caSharePercent})

**Edge Cases:**
- Contracts with < 8 activities: Empty string for unused LIBELLE/POID columns
- Missing CODE_NAF: Admin must fill manually in preview
- Avenant fields: Empty for now (leave blank in CSV)

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
