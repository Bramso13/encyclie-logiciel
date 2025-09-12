"use client";

import { useState } from "react";
import { WorkflowStep, StepStatus } from "@/lib/types/workflow";
import { useWorkflowStore } from "@/lib/stores/workflow-store";

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  onStepClick: (step: WorkflowStep) => void;
  onReorder: (stepIds: string[]) => void;
}

export default function WorkflowTimeline({ steps, onStepClick, onReorder }: WorkflowTimelineProps) {
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const { reorderSteps } = useWorkflowStore();

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case StepStatus.COMPLETED:
        return "bg-green-500";
      case StepStatus.ACTIVE:
        return "bg-blue-500";
      case StepStatus.SKIPPED:
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusText = (status: StepStatus) => {
    switch (status) {
      case StepStatus.COMPLETED:
        return "Terminé";
      case StepStatus.ACTIVE:
        return "En cours";
      case StepStatus.SKIPPED:
        return "Ignoré";
      default:
        return "En attente";
    }
  };

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    setDraggedStep(stepId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStepId: string) => {
    e.preventDefault();
    
    if (!draggedStep || draggedStep === targetStepId) {
      setDraggedStep(null);
      return;
    }

    const draggedIndex = steps.findIndex(step => step.id === draggedStep);
    const targetIndex = steps.findIndex(step => step.id === targetStepId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStep(null);
      return;
    }

    const newSteps = [...steps];
    const [draggedStepData] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(targetIndex, 0, draggedStepData);

    // Mettre à jour l'ordre
    const reorderedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));

    const stepIds = reorderedSteps.map(step => step.id);
    reorderSteps(stepIds);
    
    setDraggedStep(null);
  };

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Timeline du Workflow</h2>
        <div className="text-sm text-gray-500">
          {steps.filter(s => s.status === StepStatus.COMPLETED).length} / {steps.length} étapes terminées
        </div>
      </div>

      <div className="space-y-4">
        {sortedSteps.map((step, index) => (
          <div
            key={step.id}
            draggable
            onDragStart={(e) => handleDragStart(e, step.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, step.id)}
            className={`
              flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
              ${draggedStep === step.id ? 'opacity-50 border-blue-300' : 'border-gray-200 hover:border-gray-300'}
              ${step.status === StepStatus.ACTIVE ? 'bg-blue-50 border-blue-200' : ''}
            `}
            onClick={() => onStepClick(step)}
          >
            {/* Indicateur de statut */}
            <div className="flex-shrink-0 mr-4">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(step.status)}`}></div>
            </div>

            {/* Numéro d'ordre */}
            <div className="flex-shrink-0 mr-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                {step.order}
              </div>
            </div>

            {/* Contenu de l'étape */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {step.title}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  step.status === StepStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                  step.status === StepStatus.ACTIVE ? 'bg-blue-100 text-blue-800' :
                  step.status === StepStatus.SKIPPED ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {getStatusText(step.status)}
                </span>
              </div>
              
              {step.description && (
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {step.description}
                </p>
              )}

              {/* Informations supplémentaires */}
              <div className="flex items-center mt-2 space-x-4 text-xs text-gray-400">
                {step.assignedToBroker && (
                  <span>Assigné à: {step.assignedToBroker.name}</span>
                )}
                {step.dueDate && (
                  <span>Échéance: {new Date(step.dueDate).toLocaleDateString('fr-FR')}</span>
                )}
                {step.messages.length > 0 && (
                  <span>{step.messages.length} message{step.messages.length > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            {/* Indicateur de progression */}
            {step.inputs.length > 0 && (
              <div className="flex-shrink-0 ml-4">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${(step.inputs.filter(input => input.value).length / step.inputs.length) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {step.inputs.filter(input => input.value).length}/{step.inputs.length}
                </div>
              </div>
            )}
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500">Aucune étape définie</p>
            <p className="text-sm text-gray-400">Cliquez sur "Ajouter une étape" pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}
