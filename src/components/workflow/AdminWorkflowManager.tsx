"use client";

import { useState, useEffect } from "react";
import { WorkflowStep } from "@/lib/types/workflow";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { workflowApi } from "@/lib/api/workflow";
import WorkflowTimeline from "./WorkflowTimeline";
import StepEditorModal from "./StepEditorModal";
import StepMessagingPanel from "./StepMessagingPanel";

interface AdminWorkflowManagerProps {
  quoteId: string;
}

export default function AdminWorkflowManager({ quoteId }: AdminWorkflowManagerProps) {
  const { 
    steps, 
    isLoading, 
    error, 
    setSteps, 
    setLoading, 
    setError,
    createStep,
    updateStep,
    deleteStep,
    markStepAsCompleted,
    markStepAsActive,
    skipStep
  } = useWorkflowStore();

  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | undefined>();

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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement des étapes');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (step: WorkflowStep) => {
    setSelectedStep(step);
  };

  const handleAddStep = () => {
    setEditingStep(undefined);
    setIsEditorOpen(true);
  };

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setIsEditorOpen(true);
  };

  const handleDeleteStep = async (step: WorkflowStep) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'étape "${step.title}" ?`)) {
      await deleteStep(step.id);
    }
  };

  const handleStepStatusChange = async (step: WorkflowStep, newStatus: string) => {
    switch (newStatus) {
      case 'COMPLETED':
        await markStepAsCompleted(step.id);
        break;
      case 'ACTIVE':
        await markStepAsActive(step.id);
        break;
      case 'SKIPPED':
        await skipStep(step.id);
        break;
    }
  };

  const handleOpenMessaging = (step: WorkflowStep) => {
    setSelectedStep(step);
    setIsMessagingOpen(true);
  };

  const getNextOrder = () => {
    return steps.length > 0 ? Math.max(...steps.map(s => s.order)) + 1 : 1;
  };

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
      {/* Header avec actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Gestion du Workflow</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gérez les étapes et le suivi de ce devis
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAddStep}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter une étape
            </button>
          </div>
        </div>
      </div>

      {/* Timeline des étapes */}
      <WorkflowTimeline
        steps={steps}
        onStepClick={handleStepClick}
        onReorder={(stepIds) => {
          // TODO: Implémenter le réordonnancement
          console.log('TODO: Reorder steps', stepIds);
        }}
      />

      {/* Détails de l'étape sélectionnée */}
      {selectedStep && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedStep.title}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleOpenMessaging(selectedStep)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Messages ({selectedStep.messages.length})
              </button>
              <button
                onClick={() => handleEditStep(selectedStep)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDeleteStep(selectedStep)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Supprimer
              </button>
            </div>
          </div>

          {selectedStep.description && (
            <p className="text-gray-600 mb-4">{selectedStep.description}</p>
          )}

          {/* Statut et actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut actuel
              </label>
              <select
                value={selectedStep.status}
                onChange={(e) => handleStepStatusChange(selectedStep, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">En attente</option>
                <option value="ACTIVE">En cours</option>
                <option value="COMPLETED">Terminé</option>
                <option value="SKIPPED">Ignoré</option>
              </select>
            </div>

            {selectedStep.assignedToBroker && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigné à
                </label>
                <p className="text-sm text-gray-900">{selectedStep.assignedToBroker.name}</p>
              </div>
            )}

            {selectedStep.dueDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Échéance
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedStep.dueDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
          </div>

          {/* Champs requis */}
          {selectedStep.inputs.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Champs requis</h3>
              <div className="space-y-2">
                {selectedStep.inputs.map((input) => (
                  <div key={input.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{input.label}</span>
                      {input.required && (
                        <span className="ml-2 text-xs text-red-600">*</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{input.type}</span>
                      {input.value ? (
                        <span className="text-xs text-green-600">✓ Rempli</span>
                      ) : (
                        <span className="text-xs text-gray-400">Non rempli</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <StepEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        step={editingStep}
        quoteId={quoteId}
        nextOrder={getNextOrder()}
      />

      {selectedStep && isMessagingOpen && (
        <StepMessagingPanel
          step={selectedStep}
          onClose={() => setIsMessagingOpen(false)}
        />
      )}
    </div>
  );
}
