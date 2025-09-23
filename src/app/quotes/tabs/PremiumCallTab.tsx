import { useSession } from "@/lib/auth-client";
import { CalculationResult, Quote, PaymentInstallment, PaymentSchedule, PaymentForm, User } from "@/lib/types";
import { useState, useEffect } from "react";

interface ExtendedPaymentInstallment extends PaymentInstallment {
  schedule: {
    quote: {
      id: string;
      reference: string;
      broker: {
        id: string;
        name: string;
        email: string;
        companyName: string;
      };
      product: {
        name: string;
        code: string;
      };
    };
  };
}

export default function PaymentTrackingTab({ quote, calculationResult }: {
  quote: Quote,
  calculationResult: CalculationResult,

}) {
  const [allInstallments, setAllInstallments] = useState<ExtendedPaymentInstallment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<ExtendedPaymentInstallment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    method: '',
    reference: '',
    notes: ''
  });

  const { data: session } = useSession();
  

  const isAdmin = session?.user?.role === 'ADMIN';

  // Charger TOUS les PaymentInstallment
  useEffect(() => {
    const fetchAllInstallments = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('quoteId', quote?.id ?? '');

        const response = await fetch(`/api/payment-installments?${params}`);
        if (response.ok) {
          const data = await response.json();
          console.log(data, "data");
          setAllInstallments(data.data.installments || []);
          if (data.data.installments.length === 0) {
            await createPaymentScheduleFromCalculation();
          }
        } else if (response.status === 404) {
          // Pas d'échéances en base, créer à partir de calculationResult
          await createPaymentScheduleFromCalculation();
        }
      } catch (error) {
        console.error('Erreur lors du chargement des échéances:', error);
        // En cas d'erreur, créer depuis calculationResult
        await createPaymentScheduleFromCalculation();
      } finally {
        setLoading(false);
      }
    };

    fetchAllInstallments();
  }, [isAdmin, quote?.id]);

  // Créer l'échéancier en base à partir de calculationResult
  const createPaymentScheduleFromCalculation = async () => {
    if (!calculationResult?.echeancier?.echeances || !quote?.id) return;

    try {
      const response = await fetch(`/api/quotes/${quote.id}/payment-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculationResult })
      });

      if (response.ok) {
        // Recharger les données après création
        const params = new URLSearchParams();
        params.append('quoteId', quote.id);

        const refreshResponse = await fetch(`/api/payment-installments?${params}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setAllInstallments(data.data.installments || []);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'échéancier:', error);
    }
  };

  // Recharger les données après modification
  const refreshData = async () => {
    const params = new URLSearchParams();
    params.append('quoteId', quote?.id ?? '');

    try {
      const response = await fetch(`/api/payment-installments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAllInstallments(data.data.installments || []);
      }
    } catch (error) {
      console.error('Erreur lors du rechargement des données:', error);
    }
  };

  // Marquer un paiement comme payé (admin seulement)
  const handleMarkAsPaid = async () => {
    if (!isAdmin || !selectedInstallment) return;

    try {
      const response = await fetch(`/api/payment-installments/${selectedInstallment.id}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });

      if (response.ok) {
        await refreshData();
        setShowPaymentModal(false);
        setSelectedInstallment(null);
        setPaymentForm({ amount: '', method: '', reference: '', notes: '' });
        alert('Paiement validé avec succès !');
      } else {
        alert('Erreur lors de la validation du paiement');
      }
    } catch (error) {
      console.error('Erreur lors de la validation du paiement:', error);
      alert('Erreur lors de la validation du paiement');
    }
  };

  // Ouvrir le modal de paiement
  const openPaymentModal = (installment: ExtendedPaymentInstallment) => {
    if (!installment) return;
    setSelectedInstallment(installment);
    setPaymentForm({
      amount: (installment.amountTTC || 0).toString(),
      method: 'BANK_TRANSFER',
      reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'PARTIALLY_PAID': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtenir le texte du statut
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID': return 'Payé';
      case 'PENDING': return 'En attente';
      case 'OVERDUE': return 'En retard';
      case 'PARTIALLY_PAID': return 'Partiellement payé';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Gestion des paiements' : 'Mes échéances de paiement'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Toutes les échéances de paiement' : 'Vos échéances de paiement'}
          </p>
        </div>
      </div>

      

      {/* Tableau des échéances */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isAdmin ? 'Toutes les échéances de paiement' : 'Mes échéances de paiement'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devis
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courtier
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant TTC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paiement
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allInstallments && allInstallments.length > 0 ? allInstallments.map((installment) => (
                <tr key={installment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {installment?.schedule?.quote?.reference || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {installment?.schedule?.quote?.product?.name || 'N/A'}
                      </div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {installment?.schedule?.quote?.broker?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {installment?.schedule?.quote?.broker?.companyName || 'N/A'}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Échéance #{installment?.installmentNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {installment?.dueDate ? new Date(installment.dueDate).toLocaleDateString('fr-FR') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(installment?.amountTTC ?? 0).toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(installment?.status || 'PENDING')}`}>
                      {getStatusText(installment?.status || 'PENDING')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {installment?.paidAt ? (
                      <div>
                        <div>Payé le {new Date(installment.paidAt).toLocaleDateString('fr-FR')}</div>
                        {installment.paymentMethod && (
                          <div className="text-xs text-gray-400">
                            {installment.paymentMethod} {installment.paymentReference && `- ${installment.paymentReference}`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Non payé</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {(installment?.status === 'PENDING' || installment?.status === 'OVERDUE') ? (
                        <button
                          onClick={() => openPaymentModal(installment)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Marquer comme payé
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="px-6 py-12 text-center text-gray-500">
                    Aucune échéance trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de validation de paiement */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Valider le paiement - {selectedInstallment?.schedule?.quote?.reference || 'N/A'} - Échéance #{selectedInstallment?.installmentNumber || 'N/A'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Montant payé</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Mode de paiement</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="BANK_TRANSFER">Virement bancaire</option>
                    <option value="CHECK">Chèque</option>
                    <option value="CASH">Espèces</option>
                    <option value="CARD">Carte bancaire</option>
                    <option value="SEPA_DEBIT">Prélèvement SEPA</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Référence</label>
                  <input
                    type="text"
                    placeholder="Numéro de chèque, référence virement..."
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    rows={3}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Valider le paiement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}