"use client";

import { calculateRcdPremium } from "@/lib/tarificateurs/rcd";
import { useState, useEffect } from "react";

interface QuoteSuccessPageProps {
  quote: {
    id: string;
    reference: string;
    companyData: {
      companyName: string;
      siret: string;
      address: string;
    };
    product: {
      name: string;
      code: string;
    };
    formData?: any;
    estimatedPremium?: number;
    status: string;
    createdAt: Date | string;
  };
  onBackToDashboard: () => void;
}

export default function QuoteSuccessPage({ quote, onBackToDashboard }: QuoteSuccessPageProps) {
  const [calculatedPremium, setCalculatedPremium] = useState<number | null>(null);
  const [premiumDetails, setPremiumDetails] = useState<any>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  useEffect(() => {
    // Only calculate for RCD products with formData
    if (quote.product.code === 'RCD' && quote.formData) {
      try {
        console.log('FormData reçu:', quote.formData);
        
        // Vérification des valeurs obligatoires
        if (!quote.formData.chiffreAffaires) {
          throw new Error('Chiffre d\'affaires manquant');
        }
        if (!quote.formData.nombreSalaries && quote.formData.nombreSalaries !== 0) {
          throw new Error('Nombre de salariés manquant');
        }
        if (!quote.formData.activities || !Array.isArray(quote.formData.activities) || quote.formData.activities.length === 0) {
          throw new Error('Activités manquantes');
        }
        if (!quote.formData.territory) {
          throw new Error('Territoire manquant');
        }
        if (!quote.formData.experienceMetier) {
          throw new Error('Expérience métier manquante');
        }
        if (!quote.formData.dateEffetSouhaitee) {
          throw new Error('Date d\'effet manquante');
        }

        // Tables de données pour le calcul RCD
        const tables = {
          actiscorByCode: {
            "2": { baseRate: 0.0407, reducAt500k: 0.88, thresholdStart: 250000, reducAt1M: 0.80 },
            "11": { baseRate: 0.0350, reducAt500k: 0.85, thresholdStart: 300000, reducAt1M: 0.75 },
            "13": { baseRate: 0.0290, reducAt500k: 0.82, thresholdStart: 200000, reducAt1M: 0.72 }
          },
          taxByZone: {
            REUNION: 0.045,
            MAYOTTE: 0.045,
            MARTINIQUE: 0.045,
            GUADELOUPE: 0.045,
            GUYANE: 0.045,
            "ST-MARTIN": 0.045,
            "ST-BARTH": 0.045
          },
          fraisGestionRate: 0.03,
          echeanceUnitCost: 15,
          periodicitySplits: { annuel: 1, semestriel: 2, trimestriel: 4, mensuel: 12 },
          pminiPlancher: 2000,
          plafondPmini: 70000,
          plafondCA: 1000000,
          pjEnabledByDefault: true
        };

        // Paramètres du calcul basés sur formData - valeurs exactes vérifiées
        const params = {
          caDeclared: quote.formData.chiffreAffaires,
          headcountETP: quote.formData.nombreSalaries,
          activities: quote.formData.activities,
          territory: quote.formData.territory,
          subContractingPercent: quote.formData.subContractingPercent ? quote.formData.subContractingPercent : 0,
          tradingPercent: quote.formData.tradingPercent ? quote.formData.tradingPercent : 0,
          tables,
          coeff: {
            hasQualification: !!quote.formData.hasQualification,
            creationDateISO: quote.formData.companyCreationDate,
            yearsExperience: quote.formData.experienceMetier,
            previousRcdStatus: quote.formData.previousRcdStatus,
            previousResiliationDate: quote.formData.previousResiliationDate,
            lossHistory: quote.formData.lossHistory ? quote.formData.lossHistory : []
          },
          schedule: {
            effectiveDateISO: quote.formData.dateEffetSouhaitee,
            periodicity: quote.formData.periodicity,
            includePJ: quote.formData.includePJ !== false
          }
        };

        console.log('Paramètres calculés:', params);
        const result = calculateRcdPremium(params);
        console.log('Résultat calcul:', result);
        
        setCalculatedPremium(result.recapLikeExcel.ttcAnnuelAvecPJ);
        setPremiumDetails(result);
        
      } catch (error) {
        console.error('Erreur calcul RCD:', error);
        setCalculationError(error instanceof Error ? error.message : 'Erreur de calcul');
      }
    }
  }, [quote]);

  // Fallback calculation for non-RCD or missing data
  const calculateEstimation = () => {
    const baseAmount = 1500;
    const companyFactor = quote.companyData.companyName.length * 10;
    const productFactor = quote.product.name.includes('Responsabilité') ? 500 : 300;
    return Math.round((baseAmount + companyFactor + productFactor) / 100) * 100;
  };

  const estimation = calculatedPremium ? calculatedPremium : (quote.estimatedPremium ? quote.estimatedPremium : calculateEstimation());

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-green-800">
              Devis créé avec succès !
            </h1>
            <p className="text-green-700 mt-1">
              Votre demande de devis a été enregistrée et sera traitée dans les plus brefs délais.
            </p>
          </div>
        </div>
      </div>

      {/* Quote Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Détails de votre devis
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Référence
            </h3>
            <p className="text-lg font-mono text-gray-900">{quote.reference}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Statut
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {quote.status === 'INCOMPLETE' ? 'En cours de traitement' : quote.status}
            </span>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Entreprise
            </h3>
            <p className="text-lg text-gray-900">{quote.companyData.companyName}</p>
            <p className="text-sm text-gray-600">SIRET: {quote.companyData.siret}</p>
            <p className="text-sm text-gray-600">{quote.companyData.address}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Produit d'assurance
            </h3>
            <p className="text-lg text-gray-900">{quote.product.name}</p>
            <p className="text-sm text-gray-600">Code: {quote.product.code}</p>
          </div>
        </div>
      </div>

      {/* Estimation */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-indigo-900 mb-4">
          {premiumDetails ? 'Calcul de prime RCD' : 'Estimation préliminaire'}
        </h2>
        
        {calculationError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Erreur de calcul :</strong> {calculationError}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-indigo-700 mb-1">
              Prime d'assurance {premiumDetails ? 'calculée' : 'estimée'} (annuelle TTC)
            </p>
            <p className="text-3xl font-bold text-indigo-900">
              {estimation.toLocaleString('fr-FR')} €
            </p>
          </div>
          <div className="text-right">
            <div className="bg-indigo-100 rounded-full p-4">
              <svg
                className="h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </div>
        </div>

        {premiumDetails && (
          <div className="space-y-3">
            {/* Détail du calcul */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-900 mb-2">Prime de base</h4>
                <p className="text-sm text-gray-600">RCD HT: <span className="font-medium">{premiumDetails.recapLikeExcel.baseRcdHT.toLocaleString('fr-FR')} €</span></p>
                <p className="text-sm text-gray-600">Coefficients: <span className="font-medium">{premiumDetails.recapLikeExcel.coeffTotalPct > 0 ? '+' : ''}{premiumDetails.recapLikeExcel.coeffTotalPct}%</span></p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-900 mb-2">Frais et taxes</h4>
                <p className="text-sm text-gray-600">Taxe territoriale ({premiumDetails.recapLikeExcel.taxeAssuranceTaux}%): <span className="font-medium">{premiumDetails.recapLikeExcel.taxeAssuranceMontant.toLocaleString('fr-FR')} €</span></p>
                <p className="text-sm text-gray-600">Frais de gestion ({premiumDetails.recapLikeExcel.fraisGestionPct}%): <span className="font-medium">{premiumDetails.recapLikeExcel.fraisGestionMontant.toLocaleString('fr-FR')} €</span></p>
                <p className="text-sm text-gray-600">Protection juridique: <span className="font-medium">{premiumDetails.recapLikeExcel.protectionJuridiqueTTC.toLocaleString('fr-FR')} €</span></p>
              </div>
            </div>
            
            {/* Activités */}
            {premiumDetails.activityBreakdown && (
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-900 mb-2">Répartition par activité</h4>
                <div className="space-y-1">
                  {premiumDetails.activityBreakdown.rows.map((activity: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>Code {activity.code} ({activity.caSharePercent}%)</span>
                      <span>Taux appliqué: {(activity.appliedRate * 100).toFixed(3)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Échéancier */}
            {premiumDetails.schedule && premiumDetails.schedule.length > 0 && (
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-900 mb-2">Échéancier ({premiumDetails.recapLikeExcel.nbEcheances} échéance{premiumDetails.recapLikeExcel.nbEcheances > 1 ? 's' : ''})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {premiumDetails.schedule.map((echeance: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{new Date(echeance.date).toLocaleDateString('fr-FR')}</span>
                      <span className="font-medium">{echeance.totalTTC.toLocaleString('fr-FR')} € TTC</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-indigo-100 rounded-md">
          <p className="text-sm text-indigo-800">
            <strong>Information :</strong> {premiumDetails ? 
              'Ce calcul est basé sur les données saisies et les tarifs en vigueur. Le montant final pourra être ajusté après vérification des pièces justificatives.' :
              'Cette estimation est indicative et basée sur les informations fournies. Le montant définitif sera calculé après analyse complète de votre dossier par nos experts.'
            }
          </p>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Prochaines étapes
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Analyse de votre dossier
              </h3>
              <p className="text-sm text-gray-600">
                Nos experts vont analyser votre demande dans les 24h ouvrées
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                <span className="text-sm font-medium text-blue-600">2</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Documents complémentaires
              </h3>
              <p className="text-sm text-gray-600">
                Vous recevrez une notification si des documents supplémentaires sont nécessaires
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                <span className="text-sm font-medium text-blue-600">3</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Réception de votre devis
              </h3>
              <p className="text-sm text-gray-600">
                Vous recevrez votre devis personnalisé sous 2-3 jours ouvrés
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBackToDashboard}
          className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Retourner au tableau de bord
        </button>
      </div>
    </div>
  );
}