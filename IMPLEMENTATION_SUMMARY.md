# Implementation Summary: Onglet Offre (Offer Tab)

## Issue: LES-99
**Title:** Faire un onglet pour envoyer l'offre au courtier avec preview du formulaire pour que ca soit + pratique

## What Was Implemented

### 1. New "Offre" Tab Component
**File:** `/workspace/src/app/quotes/tabs/OffreTab.tsx`

Features:
- ✅ Admin-only access (hidden from brokers)
- ✅ Form preview showing company and calculation details
- ✅ Comprehensive document checklist with 3 categories:
  - Documents généraux (10 items)
  - Entreprises en création < 12 mois (6 items)
  - Entreprises > 12 mois précédemment assurées (6 items)
- ✅ Checkbox system for selecting required documents
- ✅ "Select All" / "Deselect All" buttons per category
- ✅ Visual summary of selected documents
- ✅ Save document selection functionality
- ✅ Send offer to broker functionality
- ✅ Status tracking (sent/not sent)

### 2. API Endpoints
**File:** `/workspace/src/app/api/quotes/[id]/offer/route.ts`

Endpoints created:
- **GET** `/api/quotes/[id]/offer` - Retrieve offer data
- **POST** `/api/quotes/[id]/offer` - Send offer to broker
- **PUT** `/api/quotes/[id]/offer` - Save document selection

Features:
- ✅ Admin-only authorization
- ✅ Creates DocumentRequest entries for each selected document
- ✅ Updates quote status to "OFFER_SENT"
- ✅ Creates notification for broker
- ✅ Stores offer data in quote.offerData field

### 3. Database Schema Updates
**File:** `/workspace/prisma/schema.prisma`

Changes:
- ✅ Added `offerData Json?` field to Quote model
- ✅ Created migration file: `20251008000000_add_offer_data`

### 4. Main Quote Page Integration
**File:** `/workspace/src/app/quotes/[id]/page.tsx`

Changes:
- ✅ Imported OffreTab component
- ✅ Added "Offre" tab to tabs array with icon
- ✅ Added tab rendering logic
- ✅ Restricted tab visibility to admins only (same as calculation tab)

## Document Checklist Implemented

### Documents Généraux
1. Questionnaire RCD signé par le proposant
2. Kbis de moins de 3 mois et les statuts de l'entreprise
3. CV du dirigeant justifiant du/des activités demandées
4. RIB/MANDAT SEPA si paiement par prélèvement automatique choisi
5. CNI du gérant
6. Qualification QUALIBAT/QUALIFELEC si applicable
7. Attestation sur l'honneur (pas de difficulté/incident)
8. Vérification de la cohérence des déclarations relatives à l'activité
9. Diplôme/certificat professionnel justifiant du/des activités demandées
10. Organigramme pour les CA supérieur à 500 000€

### Entreprises en création (< 12 mois sans activité)
1. Ventilation prévisionnelle des activités du chiffre d'affaires N
2. Certificat de travail/fiche de paie des anciens employeurs
3. Certificat de travail pour couvrir la totalité de la durée d'expérience
4. Factures émises sous son ancienne entreprise (travailleurs non-salariés)
5. Situation comptable intermédiaire
6. Attestation sur l'honneur certifiant l'emploi dans une société

### Entreprises créées > 12 mois précédemment assurées
1. Ventilation des activités du chiffre d'affaires N-1 et N
2. RI/Relevé de sinistralité de 5 ans ou depuis la création
3. Dernière attestation d'assurance mentionnant les activités assurées
4. Dernier bilan financier pour les sociétés créées depuis plus de 2 ans
5. Minimum 4 factures de chantier justifiant l'expérience déclarée
6. Attestation du gérant pour la non reprise du passé

## User Experience Flow

### For Admins:
1. Navigate to quote detail page
2. Click on "Offre" tab
3. View form preview (company data + calculation results)
4. Select required documents from checklist
5. Save selection (optional)
6. Send offer to broker
7. System automatically:
   - Creates document requests
   - Updates quote status to OFFER_SENT
   - Notifies broker

### For Brokers:
- Tab is hidden (admin only)
- Receives notification when offer is sent
- Can access document requests in "Pièce jointe" tab

## Integration with Existing Systems

The implementation integrates with:
- ✅ **Document Request System** - Uses existing DocumentRequest model
- ✅ **Notification System** - Creates notifications for brokers
- ✅ **Quote Status Workflow** - Updates status to OFFER_SENT
- ✅ **PieceJointeTab** - Broker sees requested documents there

## Technical Details

### State Management
- Uses React hooks for local state
- Fetches offer data on component mount
- Tracks document selection with Set
- Manages send status and preview visibility

### API Integration
- Admin-only authorization via withAuth
- Error handling with ApiError
- Transaction support for creating multiple document requests
- JSON storage for flexible offer data structure

### UI/UX Features
- Color-coded status indicators (blue for draft, green for sent)
- Category-based organization of documents
- Batch selection controls
- Visual confirmation of selections
- Loading states and disabled states
- Responsive design with Tailwind CSS

## Files Created/Modified

### Created:
1. `/workspace/src/app/quotes/tabs/OffreTab.tsx` (new tab component)
2. `/workspace/src/app/api/quotes/[id]/offer/route.ts` (API endpoints)
3. `/workspace/prisma/migrations/20251008000000_add_offer_data/migration.sql` (DB migration)

### Modified:
1. `/workspace/src/app/quotes/[id]/page.tsx` (added tab integration)
2. `/workspace/prisma/schema.prisma` (added offerData field)

## Next Steps (Optional Enhancements)

1. **Email Notification** - Send email to broker when offer is sent
2. **Document Status Tracking** - Show which documents have been uploaded
3. **Offer History** - Track multiple offer revisions
4. **PDF Generation** - Generate offer document PDF
5. **Deadline Management** - Add due dates for document submission
6. **Template System** - Save document selection as templates for reuse

## Testing Recommendations

1. Test admin access restrictions
2. Verify document selection persistence
3. Test offer send workflow
4. Verify notification creation
5. Test integration with document request system
6. Verify quote status updates correctly
7. Test form preview data accuracy

---

**Implementation Status:** ✅ Complete
**Linear Issue:** LES-99
**Date:** October 8, 2025

