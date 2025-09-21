import AdminWorkflowManager from "@/components/workflow/AdminWorkflowManager";
import BrokerWorkflowExecutor from "@/components/workflow/BrokerWorkflowExecutor";
import { Quote } from "@/lib/types";


export default function ResumeTab({
  quote,
  isAdmin,
}: {
  quote: Quote;
  isAdmin: boolean;
}) {
    const getStatusDotColor = (status: string) => {
        const colorMap: Record<string, string> = {
          DRAFT: "bg-gray-500",
          INCOMPLETE: "bg-yellow-500",
          SUBMITTED: "bg-blue-500",
          IN_PROGRESS: "bg-yellow-500",
          COMPLEMENT_REQUIRED: "bg-orange-500",
          OFFER_READY: "bg-green-500",
          OFFER_SENT: "bg-blue-500",
          ACCEPTED: "bg-green-500",
          REJECTED: "bg-red-500",
          EXPIRED: "bg-gray-500",
        };
        return colorMap[status] || "bg-gray-500";
      };
      // Fonctions utilitaires pour l'onglet Résumé
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      DRAFT: { color: "bg-gray-100 text-gray-800", text: "Brouillon" },
      INCOMPLETE: {
        color: "bg-yellow-100 text-yellow-800",
        text: "A compléter",
      },
      SUBMITTED: { color: "bg-blue-100 text-blue-800", text: "Soumis" },
      IN_PROGRESS: { color: "bg-yellow-100 text-yellow-800", text: "En cours" },
      COMPLEMENT_REQUIRED: {
        color: "bg-orange-100 text-orange-800",
        text: "Complément demandé",
      },
      OFFER_READY: { color: "bg-green-100 text-green-800", text: "Offre prête" },
      OFFER_SENT: { color: "bg-blue-100 text-blue-800", text: "Offre envoyée" },
      ACCEPTED: { color: "bg-green-100 text-green-800", text: "Acceptée" },
      REJECTED: { color: "bg-red-100 text-red-800", text: "Refusée" },
      EXPIRED: { color: "bg-gray-100 text-gray-800", text: "Expirée" },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span
        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  const updateQuoteStatusAdmin = async (quoteId: string, newStatus: string, reason: string) => {
    // TODO: Implement admin status change with audit log
    console.log('TODO: Implement admin status update', { quoteId, newStatus, reason });
  };
  

  const getTimeSinceUpdate = (updatedAt: string) => {
    const now = new Date();
    const updateDate = new Date(updatedAt);
    const diffInMinutes = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours}h`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  };
  return (
    <div className="space-y-6">
      {isAdmin ? (
        // DASHBOARD ADMIN - Nouveau système de workflow
        <>
          {/* Status Control Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Contrôle du statut
              </h2>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusDotColor(
                    quote.status
                  )}`}
                ></div>
                {getStatusBadge(quote.status)}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Référence</p>
                <p className="text-lg font-medium text-gray-900">
                  {quote.reference}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Produit</p>
                <p className="text-lg font-medium text-gray-900">
                  {quote.product.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Créé le</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dernière mise à jour</p>
                <p className="text-lg font-medium text-gray-900">
                  {getTimeSinceUpdate(quote.updatedAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                Changer le statut :
              </span>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) =>
                  updateQuoteStatusAdmin(
                    quote.id,
                    e.target.value,
                    "Admin status change"
                  )
                }
              >
                <option value="">Sélectionner un statut</option>
                <option value="DRAFT">Brouillon</option>
                <option value="INCOMPLETE">A compléter</option>
                <option value="SUBMITTED">Soumis</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLEMENT_REQUIRED">Complément demandé</option>
                <option value="OFFER_READY">Offre prête</option>
                <option value="OFFER_SENT">Offre envoyée</option>
                <option value="ACCEPTED">Acceptée</option>
                <option value="REJECTED">Refusée</option>
              </select>
            </div>
          </div>

          {/* Gestionnaire de workflow */}
          <AdminWorkflowManager quoteId={quote.id} />

          {/* Administrative Actions Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Actions administratives
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() =>
                  updateQuoteStatusAdmin(
                    quote.id,
                    "ACCEPTED",
                    "Admin approved quote"
                  )
                }
                className="flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Valider le devis
              </button>

              <button
                onClick={() =>
                  updateQuoteStatusAdmin(
                    quote.id,
                    "COMPLEMENT_REQUIRED",
                    "Admin requested additional info"
                  )
                }
                className="flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Demander compléments
              </button>

              <button
                onClick={() =>
                  updateQuoteStatusAdmin(
                    quote.id,
                    "OFFER_READY",
                    "Admin approved offer"
                  )
                }
                className="flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Approuver l'offre
              </button>

              <button
                onClick={() =>
                  updateQuoteStatusAdmin(
                    quote.id,
                    "REJECTED",
                    "Admin rejected quote"
                  )
                }
                className="flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
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
                Rejeter le devis
              </button>
            </div>
          </div>
        </>
      ) : (
        // DASHBOARD BROKER
        <>
          {/* Status Display Card (Read-only) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Statut du devis
              </h2>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusDotColor(
                    quote.status
                  )}`}
                ></div>
                {getStatusBadge(quote.status)}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Référence</p>
                <p className="text-lg font-medium text-gray-900">
                  {quote.reference}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Produit</p>
                <p className="text-lg font-medium text-gray-900">
                  {quote.product.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Créé le</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dernière mise à jour</p>
                <p className="text-lg font-medium text-gray-900">
                  {getTimeSinceUpdate(quote.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Gestionnaire de workflow pour les brokers */}
          <BrokerWorkflowExecutor quoteId={quote.id} />

          {/* My Assigned Tasks Card */}
          {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes tâches assignées</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-900 font-medium">Compléter le formulaire</span>
            </div>
            <button 
              onClick={() => completeAssignedTask(quote.id, 'task1')}
              className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-full hover:bg-yellow-200"
            >
              Marquer comme terminé
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-900 font-medium">Vérifier les informations</span>
            </div>
            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 border border-green-300 rounded-full">
              Terminé
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-900 font-medium">Contacter le client</span>
            </div>
            <button 
              onClick={() => completeAssignedTask(quote.id, 'task3')}
              className="px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 border border-blue-300 rounded-full hover:bg-blue-200"
            >
              Marquer comme terminé
            </button>
          </div>
        </div>
      </div> */}

          {/* Progress Timeline (Read-only) */}
          {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Progression du devis</h2>
        <div className="relative">
          <div className="flex items-center justify-between">
            {getProgressSteps().map((step, index) => {
              const currentStepIndex = getProgressSteps().findIndex(s => s.status === quote.status);
              const isCompleted = currentStepIndex > index;
              const isCurrent = step.status === quote.status;
              const isLast = index === getProgressSteps().length - 1;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                      ? `${getStatusDotColor(quote.status)} text-white` 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center ${
                    isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {!isLast && (
                    <div className={`absolute top-4 left-1/2 h-0.5 w-full ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} style={{ transform: 'translateX(50%)', width: 'calc(100% - 2rem)' }}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div> */}

          {/* Notes Section */}
          {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes pour l'administrateur</h2>
        <div className="space-y-3">
          <textarea
            placeholder="Ajouter une note pour l'administrateur..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
          />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            Envoyer la note
          </button>
        </div>
      </div> */}
        </>
      )}
    </div>
  );
}
