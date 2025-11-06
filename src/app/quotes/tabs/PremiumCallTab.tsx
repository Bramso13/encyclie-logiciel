import { useSession } from "@/lib/auth-client";
import {
  CalculationResult,
  Quote,
  PaymentInstallment,
  PaymentSchedule,
  PaymentForm,
  User,
} from "@/lib/types";
import { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import AttestationRCDPDF from "@/components/pdf/AttestationRCDPDF";

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

export default function PaymentTrackingTab({
  quote,
  calculationResult,
}: {
  quote: Quote;
  calculationResult: CalculationResult;
}) {
  const [allInstallments, setAllInstallments] = useState<
    ExtendedPaymentInstallment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<ExtendedPaymentInstallment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: "",
    method: "",
    reference: "",
    notes: "",
  });
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [
    selectedInstallmentForAttestation,
    setSelectedInstallmentForAttestation,
  ] = useState<ExtendedPaymentInstallment | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingAttestation, setGeneratingAttestation] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";

  // Charger TOUS les PaymentInstallment
  useEffect(() => {
    const fetchAllInstallments = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("quoteId", quote?.id ?? "");

        const response = await fetch(`/api/payment-installments?${params}`);
        if (response.ok) {
          const data = await response.json();
          console.log(data, "data");
          setAllInstallments(data.data.installments || []);
          if (data.data.installments.length === 0) {
            console.log("createPaymentScheduleFromCalculation");
            await createPaymentScheduleFromCalculation();
          }
        } else if (response.status === 404) {
          // Pas d'échéances en base, créer à partir de calculationResult
          await createPaymentScheduleFromCalculation();
        }
      } catch (error) {
        console.error("Erreur lors du chargement des échéances:", error);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calculationResult }),
      });

      if (response.ok) {
        // Recharger les données après création
        const params = new URLSearchParams();
        params.append("quoteId", quote.id);

        const refreshResponse = await fetch(
          `/api/payment-installments?${params}`
        );
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setAllInstallments(data.data.installments || []);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'échéancier:", error);
    }
  };

  // Recharger les données après modification
  const refreshData = async () => {
    const params = new URLSearchParams();
    params.append("quoteId", quote?.id ?? "");

    try {
      const response = await fetch(`/api/payment-installments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAllInstallments(data.data.installments || []);
      }
    } catch (error) {
      console.error("Erreur lors du rechargement des données:", error);
    }
  };

  // Marquer un paiement comme payé (admin seulement)
  const handleMarkAsPaid = async () => {
    if (!isAdmin || !selectedInstallment) return;

    try {
      const response = await fetch(
        `/api/payment-installments/${selectedInstallment.id}/mark-paid`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentForm),
        }
      );

      if (response.ok) {
        await refreshData();
        setShowPaymentModal(false);
        setSelectedInstallment(null);
        setPaymentForm({ amount: "", method: "", reference: "", notes: "" });
        alert("Paiement validé avec succès !");
      } else {
        alert("Erreur lors de la validation du paiement");
      }
    } catch (error) {
      console.error("Erreur lors de la validation du paiement:", error);
      alert("Erreur lors de la validation du paiement");
    }
  };

  // Ouvrir le modal de paiement
  const openPaymentModal = (installment: ExtendedPaymentInstallment) => {
    if (!installment) return;
    setSelectedInstallment(installment);
    setPaymentForm({
      amount: (installment.amountTTC || 0).toString(),
      method: "BANK_TRANSFER",
      reference: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  // Ouvrir le modal d'attestation
  const openAttestationModal = async (
    installment: ExtendedPaymentInstallment
  ) => {
    if (!installment || !quote) return;

    setSelectedInstallmentForAttestation(installment);
    setGeneratingAttestation(true);
    setShowAttestationModal(true);

    try {
      // Calculer les dates pour l'attestation
      const startDate = installment.periodStart
        ? new Date(installment.periodStart)
        : quote.formData?.dateDeffet
        ? new Date(quote.formData.dateDeffet)
        : new Date();
      const endDate = installment.periodEnd
        ? new Date(installment.periodEnd)
        : new Date(
            startDate.getFullYear() + 1,
            startDate.getMonth(),
            startDate.getDate()
          );
      const attestationDate = installment.paidAt
        ? new Date(installment.paidAt)
        : new Date();
      const validityStartDate = attestationDate;
      const validityEndDate = new Date(
        validityStartDate.getFullYear() + 1,
        validityStartDate.getMonth(),
        validityStartDate.getDate()
      );

      // Générer le numéro de contrat (format: RCD + référence du devis)
      const contractNumber = `RCD${quote.reference || "WAK"}`;

      // Générer le PDF
      const pdfBlob = await pdf(
        <AttestationRCDPDF
          quote={quote}
          contractNumber={contractNumber}
          startDate={startDate.toISOString()}
          endDate={endDate.toISOString()}
          attestationDate={attestationDate.toISOString()}
          validityStartDate={validityStartDate.toISOString()}
          validityEndDate={validityEndDate.toISOString()}
        />
      ).toBlob();

      // Créer une URL pour le PDF
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Erreur lors de la génération de l'attestation");
      setShowAttestationModal(false);
    } finally {
      setGeneratingAttestation(false);
    }
  };

  // Fermer le modal d'attestation
  const closeAttestationModal = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setShowAttestationModal(false);
    setSelectedInstallmentForAttestation(null);
  };

  // Envoyer l'attestation par email
  const handleSendAttestationEmail = async () => {
    if (!selectedInstallmentForAttestation || !quote || !pdfUrl) return;

    setSendingEmail(true);
    try {
      // Récupérer l'email du client
      const clientEmail =
        quote.formData?.mailAddress || quote.broker?.email || "";

      if (!clientEmail) {
        alert(
          "Impossible d'envoyer l'email : adresse email du client manquante"
        );
        setSendingEmail(false);
        return;
      }

      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        alert("L'adresse email du client n'est pas valide");
        setSendingEmail(false);
        return;
      }

      // Télécharger le PDF depuis l'URL
      const response = await fetch(pdfUrl);
      const pdfBlob = await response.blob();

      // Calculer les dates
      const startDate = selectedInstallmentForAttestation.periodStart
        ? new Date(selectedInstallmentForAttestation.periodStart)
        : quote.formData?.dateDeffet
        ? new Date(quote.formData.dateDeffet)
        : new Date();
      const endDate = selectedInstallmentForAttestation.periodEnd
        ? new Date(selectedInstallmentForAttestation.periodEnd)
        : new Date(
            startDate.getFullYear() + 1,
            startDate.getMonth(),
            startDate.getDate()
          );
      const attestationDate = selectedInstallmentForAttestation.paidAt
        ? new Date(selectedInstallmentForAttestation.paidAt)
        : new Date();
      const validityStartDate = attestationDate;
      const validityEndDate = new Date(
        validityStartDate.getFullYear() + 1,
        validityStartDate.getMonth(),
        validityStartDate.getDate()
      );

      const contractNumber = `RCD${quote.reference || "WAK"}`;

      // Préparer les données pour l'API
      const formData = new FormData();
      formData.append("quoteId", quote.id);
      formData.append(
        "companyName",
        quote.formData?.companyName || quote.companyData?.companyName || ""
      );
      formData.append("clientEmail", clientEmail);
      formData.append("contractNumber", contractNumber);
      formData.append("pdf", pdfBlob, `attestation-rcd-${quote.reference}.pdf`);

      const apiResponse = await fetch("/api/email/send-attestation", {
        method: "POST",
        body: formData,
      });

      if (apiResponse.ok) {
        alert(`Attestation envoyée par email à ${clientEmail} avec succès !`);
      } else {
        const errorData = await apiResponse.json();
        alert(`Erreur lors de l'envoi : ${errorData.error}`);
      }
    } catch (error) {
      console.error("Erreur envoi email attestation:", error);
      alert("Erreur lors de l'envoi de l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "PARTIALLY_PAID":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Obtenir le texte du statut
  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Payé";
      case "PENDING":
        return "En attente";
      case "OVERDUE":
        return "En retard";
      case "PARTIALLY_PAID":
        return "Partiellement payé";
      default:
        return status;
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
            {isAdmin ? "Gestion des paiements" : "Mes échéances de paiement"}
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin
              ? "Toutes les échéances de paiement"
              : "Vos échéances de paiement"}
          </p>
        </div>
      </div>

      {/* Tableau des échéances */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isAdmin
              ? "Toutes les échéances de paiement"
              : "Mes échéances de paiement"}
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
              {allInstallments && allInstallments.length > 0 ? (
                allInstallments.map((installment) => (
                  <tr key={installment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {installment?.schedule?.quote?.reference || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {installment?.schedule?.quote?.product?.name || "N/A"}
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {installment?.schedule?.quote?.broker?.name ||
                              "N/A"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {installment?.schedule?.quote?.broker
                              ?.companyName || "N/A"}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Échéance #{installment?.installmentNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {installment?.dueDate
                        ? new Date(installment.dueDate).toLocaleDateString(
                            "fr-FR"
                          )
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {(installment?.amountTTC ?? 0).toLocaleString("fr-FR")} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          installment?.status || "PENDING"
                        )}`}
                      >
                        {getStatusText(installment?.status || "PENDING")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {installment?.paidAt ? (
                        <div>
                          <div>
                            Payé le{" "}
                            {new Date(installment.paidAt).toLocaleDateString(
                              "fr-FR"
                            )}
                          </div>
                          {installment.paymentMethod && (
                            <div className="text-xs text-gray-400">
                              {installment.paymentMethod}{" "}
                              {installment.paymentReference &&
                                `- ${installment.paymentReference}`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Non payé</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          {installment?.status === "PENDING" ||
                          installment?.status === "OVERDUE" ? (
                            <button
                              onClick={() => openPaymentModal(installment)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Marquer comme payé
                            </button>
                          ) : installment?.status === "PAID" ? (
                            <button
                              onClick={() => openAttestationModal(installment)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Voir et envoyer attestation
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
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
                Valider le paiement -{" "}
                {selectedInstallment?.schedule?.quote?.reference || "N/A"} -
                Échéance #{selectedInstallment?.installmentNumber || "N/A"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Montant payé
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mode de paiement
                  </label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        method: e.target.value,
                      }))
                    }
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
                  <label className="block text-sm font-medium text-gray-700">
                    Référence
                  </label>
                  <input
                    type="text"
                    placeholder="Numéro de chèque, référence virement..."
                    value={paymentForm.reference}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        reference: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
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

      {/* Modal d'attestation */}
      {showAttestationModal && selectedInstallmentForAttestation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[90%] max-w-5xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Attestation d'assurance RCD -{" "}
                  {selectedInstallmentForAttestation?.schedule?.quote
                    ?.reference || "N/A"}
                  {" - "}
                  Échéance #
                  {selectedInstallmentForAttestation?.installmentNumber ||
                    "N/A"}
                </h3>
                <button
                  onClick={closeAttestationModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {generatingAttestation ? (
                <div className="flex justify-center items-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <span className="ml-4 text-gray-600">
                    Génération de l'attestation...
                  </span>
                </div>
              ) : pdfUrl ? (
                <div className="space-y-4">
                  <div
                    className="border rounded-lg overflow-hidden"
                    style={{ height: "600px" }}
                  >
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="Attestation RCD PDF"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeAttestationModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={handleSendAttestationEmail}
                      disabled={sendingEmail}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {sendingEmail ? "Envoi en cours..." : "Envoyer par email"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Erreur lors de la génération du PDF
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
