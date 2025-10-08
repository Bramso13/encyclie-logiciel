# Onglet Offre - Workflow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Quote Detail Page                        │
│                 /quotes/[quoteId]/page.tsx                  │
│                                                             │
│  Tabs: [Résumé][Formulaire][Calcul][Lettre][Échéancier]   │
│        [Pièce jointe][Chat][Commissions][OFFRE] ← NEW!     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ (Admin clicks "Offre" tab)
                              │
┌─────────────────────────────────────────────────────────────┐
│                      OffreTab Component                      │
│                 /tabs/OffreTab.tsx                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Preview Section (Admin Only)                         │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│  │  • Company Information (SIRET, Name, Address, etc.)   │ │
│  │  • Calculation Results (Prime Base, TTC, Taxes)       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Document Checklist                                   │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│  │                                                        │ │
│  │  □ Documents Généraux (10 items)                      │ │
│  │    ☑ Questionnaire RCD signé                          │ │
│  │    ☑ Kbis de moins de 3 mois                          │ │
│  │    □ CV du dirigeant                                  │ │
│  │    ... (7 more)                                       │ │
│  │                                                        │ │
│  │  □ Entreprises en création < 12 mois (6 items)        │ │
│  │    □ Ventilation prévisionnelle                       │ │
│  │    □ Certificat de travail                            │ │
│  │    ... (4 more)                                       │ │
│  │                                                        │ │
│  │  □ Entreprises > 12 mois assurées (6 items)          │ │
│  │    □ Ventilation activités N-1 et N                   │ │
│  │    □ Relevé de sinistralité                           │ │
│  │    ... (4 more)                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Save Selection]  [Send Offer to Broker] ← Action Buttons │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ (Admin clicks "Send Offer")
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API: POST /api/quotes/[id]/offer         │
│                    /api/quotes/[id]/offer/route.ts          │
│                                                             │
│  1. Verify admin authorization                             │
│  2. Validate document selection                            │
│  3. Create DocumentRequest for each selected doc           │
│  4. Update Quote:                                          │
│     • Set offerData = {requiredDocuments, calc, etc}       │
│     • Set offerSentAt = new Date()                         │
│     • Set status = "OFFER_SENT"                            │
│  5. Create Notification for broker                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
          ┌─────────────────┐   ┌──────────────────┐
          │  Database       │   │  Notification    │
          │  Updates        │   │  System          │
          └─────────────────┘   └──────────────────┘
                    │                   │
                    ↓                   ↓
          ┌─────────────────┐   ┌──────────────────┐
          │ Quote.offerData │   │ Email/Push to    │
          │ Quote.status    │   │ Broker           │
          │ DocumentRequest │   └──────────────────┘
          └─────────────────┘
                    │
                    ↓
          ┌─────────────────────────────────────────┐
          │  Broker sees in PieceJointeTab:         │
          │  - Document requests appear             │
          │  - Can upload required documents        │
          │  - Documents linked to requests         │
          └─────────────────────────────────────────┘
```

## Data Flow

### 1. Initial Load
```
User opens quote → OffreTab mounts → Fetch existing offer data
                                   → Display saved selections (if any)
```

### 2. Document Selection
```
Admin checks boxes → State updates in OffreTab
                  → Can save without sending (PUT /api/quotes/[id]/offer)
```

### 3. Sending Offer
```
Admin clicks "Send" → POST /api/quotes/[id]/offer
                   → Creates DocumentRequest entries
                   → Updates Quote (offerData, status, offerSentAt)
                   → Creates Notification
                   → Broker receives notification
```

### 4. Document Fulfillment (Existing Flow)
```
Broker uploads docs → PieceJointeTab
                   → Documents linked to requests
                   → Request marked as fulfilled
```

## Database Schema Changes

### Quote Model (Updated)
```prisma
model Quote {
  // ... existing fields ...
  
  offerData Json?      // NEW: Stores offer details
  offerSentAt DateTime?
  status QuoteStatus
  
  // ... existing relations ...
}
```

### DocumentRequest Model (Existing, used by Offer)
```prisma
model DocumentRequest {
  id                    String
  quoteId              String
  documentType         String
  description          String?
  isRequired           Boolean
  requestedById        String
  requestedAt          DateTime
  isFulfilled          Boolean
  fulfilledByDocumentId String?
  
  // Relations
  quote                Quote
  requestedBy          User
  fulfilledByDocument  QuoteDocument?
}
```

## Key Features

### Security
- ✅ Admin-only access to tab
- ✅ Admin-only API authorization
- ✅ Broker sees only document requests, not offer details

### User Experience
- ✅ Preview before sending
- ✅ Category-based organization
- ✅ Batch selection controls
- ✅ Visual confirmation
- ✅ Status tracking (sent/not sent)

### Integration
- ✅ Uses existing DocumentRequest system
- ✅ Integrates with notification system
- ✅ Updates quote workflow status
- ✅ Works with PieceJointeTab for fulfillment

## API Endpoints

### GET /api/quotes/[id]/offer
- **Auth**: Admin only
- **Returns**: Offer data, sent status, sent date
- **Use**: Load existing offer data

### POST /api/quotes/[id]/offer
- **Auth**: Admin only
- **Body**: `{requiredDocuments, calculationResult, formData, companyData}`
- **Actions**:
  1. Create DocumentRequest for each document
  2. Update Quote.offerData
  3. Set Quote.status = "OFFER_SENT"
  4. Set Quote.offerSentAt
  5. Create notification for broker
- **Returns**: Offer confirmation

### PUT /api/quotes/[id]/offer
- **Auth**: Admin only
- **Body**: `{requiredDocuments}`
- **Actions**: Save document selection without sending
- **Returns**: Updated selection

## Files Overview

```
/workspace/
├── src/
│   ├── app/
│   │   ├── quotes/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx           # ✏️ Modified: Added Offre tab
│   │   │   └── tabs/
│   │   │       └── OffreTab.tsx       # ✨ NEW: Main offer tab
│   │   └── api/
│   │       └── quotes/
│   │           └── [id]/
│   │               └── offer/
│   │                   └── route.ts   # ✨ NEW: API endpoints
│   └── lib/
│       └── types.ts                   # (No changes needed)
└── prisma/
    ├── schema.prisma                  # ✏️ Modified: Added offerData
    └── migrations/
        └── 20251008000000_add_offer_data/
            └── migration.sql          # ✨ NEW: DB migration
```

## Testing Checklist

- [ ] Admin can access Offre tab
- [ ] Broker cannot see Offre tab
- [ ] Preview shows correct company data
- [ ] Preview shows correct calculation results
- [ ] Document checkboxes work
- [ ] Select All / Deselect All works per category
- [ ] Save selection persists
- [ ] Send offer creates document requests
- [ ] Send offer updates quote status
- [ ] Send offer creates broker notification
- [ ] Broker sees document requests in PieceJointeTab
- [ ] After sending, button shows "Offre envoyée"
- [ ] Cannot send twice (button disabled)

---

**Status**: ✅ Implementation Complete
**Issue**: LES-99

