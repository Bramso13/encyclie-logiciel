"use client";

import { useState, useEffect } from "react";
import { WorkflowStep, StepInput, InputType, CreateStepMessageData, MessageType } from "@/lib/types/workflow";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { workflowApi } from "@/lib/api/workflow";
import { authClient } from "@/lib/auth-client";

import StepMessagingPanel from "./StepMessagingPanel";
import StepInputForm from "./StepInputForm";

interface BrokerWorkflowExecutorProps {
  quoteId: string;
}

export default function BrokerWorkflowExecutor({ quoteId }: BrokerWorkflowExecutorProps) {
  const { 
    steps, 
    isLoading, 
    error, 
    setSteps, 
    setLoading, 
    setError,
    addMessage,
    submitStepInputs,
    markStepAsCompleted,
    markStepAsActive
  } = useWorkflowStore();

  const { data: session } = authClient.useSession();
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});

  // Charger les étapes du workflow
  useEffect(() => {
    loadWorkflowSteps();
  }, [quoteId]);

  const loadWorkflowSteps = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const workflowSteps = await workflowApi.getSteps(quoteId);
      setSteps(workflowSteps);
      
      // Définir l'étape active par défaut
      const activeStep = workflowSteps.find(step => step.status === "ACTIVE");
      if (activeStep) {
        setSelectedStep(activeStep);
        // Initialiser les valeurs des inputs
        const initialValues: Record<string, any> = {};
        activeStep.inputs.forEach(input => {
          if (input.value !== undefined) {
            initialValues[input.id] = input.value;
          }
        });
        setInputValues(initialValues);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement des étapes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'ACTIVE':
        return 'bg-blue-500';
      case 'SKIPPED':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Terminé';
      case 'ACTIVE':
        return 'En cours';
      case 'SKIPPED':
        return 'Ignoré';
      default:
        return 'En attente';
    }
  };

  const handleStepClick = (step: WorkflowStep) => {
    setSelectedStep(step);
    // Initialiser les valeurs des inputs
    const initialValues: Record<string, any> = {};
    step.inputs.forEach(input => {
      if (input.value !== undefined) {
        initialValues[input.id] = input.value;
      }
    });
    setInputValues(initialValues);
  };

  const handleInputChange = (inputId: string, value: any) => {
    setInputValues(prev => ({
      ...prev,
      [inputId]: value
    }));
  };

  const handleSubmitInputs = async () => {
    if (!selectedStep) return;

    try {
      await submitStepInputs(selectedStep.id, { inputs: inputValues });
      // Marquer l'étape comme terminée si tous les champs requis sont remplis
      const allRequiredFilled = selectedStep.inputs
        .filter(input => input.required)
        .every(input => inputValues[input.id] !== undefined && inputValues[input.id] !== '');
      
      if (allRequiredFilled) {
        await markStepAsCompleted(selectedStep.id);
        // Passer à l'étape suivante
        const nextStep = steps.find(step => step.order === selectedStep.order + 1);
        if (nextStep) {
          await markStepAsActive(nextStep.id);
          setSelectedStep(nextStep);
          setInputValues({});
        }
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const handleOpenMessaging = () => {
    if (selectedStep) {
      setIsMessagingOpen(true);
    }
  };

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement du workflow...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadWorkflowSteps}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Workflow du Devis</h1>
            <p className="text-sm text-gray-500 mt-1">
              Suivez les étapes pour traiter ce devis
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            {steps.filter(s => s.status === 'COMPLETED').length} / {steps.length} étapes terminées
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline des étapes */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Étapes</h2>
            <div className="space-y-3">
              {sortedSteps.map((step) => (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStep?.id === step.id 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(step.status)}`}></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {step.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {getStatusText(step.status)}
                      </p>
                    </div>
                    {step.messages.length > 0 && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {step.messages.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contenu de l'étape sélectionnée */}
        <div className="lg:col-span-2">
          {selectedStep ? (
            <div className="space-y-6">
              {/* En-tête de l'étape */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedStep.title}
                    </h2>
                    {selectedStep.description && (
                      <p className="text-gray-600 mt-1">{selectedStep.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedStep.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      selectedStep.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      selectedStep.status === 'SKIPPED' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getStatusText(selectedStep.status)}
                    </span>
                    <button
                      onClick={handleOpenMessaging}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Messages ({selectedStep.messages.length})
                    </button>
                  </div>
                </div>

                {/* Informations supplémentaires */}
                {(selectedStep.assignedToBroker || selectedStep.dueDate) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                    {selectedStep.assignedToBroker && (
                      <div>
                        <span className="font-medium">Assigné à:</span> {selectedStep.assignedToBroker.name}
                      </div>
                    )}
                    {selectedStep.dueDate && (
                      <div>
                        <span className="font-medium">Échéance:</span> {new Date(selectedStep.dueDate).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Formulaire des inputs */}
              {selectedStep.inputs.length > 0 && (
                <StepInputForm
                  inputs={selectedStep.inputs}
                  values={inputValues}
                  onChange={handleInputChange}
                  onSubmit={handleSubmitInputs}
                  isSubmitting={false}
                />
              )}

              {/* Messages récents */}
              {selectedStep.messages.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Messages récents</h3>
                  <div className="space-y-3">
                    {selectedStep.messages.slice(-3).map((message) => (
                      <div key={message.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {message.author.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {message.author.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleOpenMessaging}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Voir tous les messages →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez une étape</h3>
              <p className="text-gray-500">Cliquez sur une étape dans la liste pour voir les détails</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de messaging */}
      {selectedStep && isMessagingOpen && (
        <StepMessagingPanel
          step={selectedStep}
          onClose={() => setIsMessagingOpen(false)}
        />
      )}
    </div>
  );
}
