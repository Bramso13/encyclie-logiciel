"use client";

import { useState, useEffect } from "react";
import { WorkflowStep, StepInput, InputType, CreateWorkflowStepData, STEP_TEMPLATES } from "@/lib/types/workflow";
import { useWorkflowStore } from "@/lib/stores/workflow-store";

interface StepEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  step?: WorkflowStep;
  quoteId: string;
  nextOrder: number;
}

export default function StepEditorModal({ 
  isOpen, 
  onClose, 
  step, 
  quoteId, 
  nextOrder 
}: StepEditorModalProps) {
  const { createStep, updateStep } = useWorkflowStore();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedToBrokerId: "",
    dueDate: "",
    templateId: ""
  });
  
  const [inputs, setInputs] = useState<Partial<StepInput>[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (step) {
      setFormData({
        title: step.title,
        description: step.description || "",
        assignedToBrokerId: step.assignedToBrokerId || "",
        dueDate: step.dueDate ? new Date(step.dueDate).toISOString().split('T')[0] : "",
        templateId: step.templateId || ""
      });
      setInputs(step.inputs.map(input => ({
        type: input.type,
        label: input.label,
        placeholder: input.placeholder,
        required: input.required,
        options: input.options
      })));
    } else {
      setFormData({
        title: "",
        description: "",
        assignedToBrokerId: "",
        dueDate: "",
        templateId: ""
      });
      setInputs([]);
    }
  }, [step, isOpen]);

  const handleTemplateSelect = (templateKey: string) => {
    if (templateKey === "") {
      setInputs([]);
      setSelectedTemplate("");
      return;
    }

    const template = STEP_TEMPLATES[templateKey as keyof typeof STEP_TEMPLATES];
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.title,
        description: template.description || ""
      }));
      setInputs([...template.defaultInputs] as Partial<StepInput>[]);
      setSelectedTemplate(templateKey);
    }
  };

  const addInput = () => {
    setInputs(prev => [...prev, {
      type: InputType.TEXT,
      label: "",
      placeholder: "",
      required: false,
      options: []
    }]);
  };

  const removeInput = (index: number) => {
    setInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateInput = (index: number, field: keyof StepInput, value: any) => {
    setInputs(prev => prev.map((input, i) => 
      i === index ? { ...input, [field]: value } : input
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const stepData: CreateWorkflowStepData = {
        quoteId: quoteId,
        title: formData.title,
        description: formData.description,
        order: step?.order || nextOrder,
        assignedToBrokerId: formData.assignedToBrokerId || undefined,
        dueDate: formData.dueDate || undefined,
        templateId: formData.templateId || undefined,
        inputs: inputs.filter(input => input.label?.trim())
      };

      if (step) {
        await updateStep(step.id, stepData);
      } else {
        await createStep(stepData);
      }

      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step ? "Modifier l'étape" : "Nouvelle étape"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template (optionnel)
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Créer une étape personnalisée</option>
              <option value="DOCUMENT_VERIFICATION">Vérification documents</option>
              <option value="RISK_ANALYSIS">Analyse des risques</option>
              <option value="COMMERCIAL_VALIDATION">Validation commerciale</option>
            </select>
          </div>

          {/* Titre et Description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de l'étape *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Assignation et Échéance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigné à (optionnel)
              </label>
              <input
                type="text"
                value={formData.assignedToBrokerId}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedToBrokerId: e.target.value }))}
                placeholder="ID du broker"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'échéance
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Inputs Dynamiques */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Champs requis pour cette étape
              </label>
              <button
                type="button"
                onClick={addInput}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ajouter un champ
              </button>
            </div>

            <div className="space-y-4">
              {inputs.map((input, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={input.type || InputType.TEXT}
                        onChange={(e) => updateInput(index, 'type', e.target.value as InputType)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={InputType.TEXT}>Texte</option>
                        <option value={InputType.TEXTAREA}>Zone de texte</option>
                        <option value={InputType.SELECT}>Liste déroulante</option>
                        <option value={InputType.DATE}>Date</option>
                        <option value={InputType.FILE}>Fichier</option>
                        <option value={InputType.CHECKBOX}>Case à cocher</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Label *
                      </label>
                      <input
                        type="text"
                        value={input.label || ""}
                        onChange={(e) => updateInput(index, 'label', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={input.placeholder || ""}
                        onChange={(e) => updateInput(index, 'placeholder', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeInput(index)}
                        className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={input.required || false}
                        onChange={(e) => updateInput(index, 'required', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Champ obligatoire</span>
                    </label>
                  </div>

                  {/* Options pour les champs SELECT */}
                  {input.type === InputType.SELECT && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Options (une par ligne)
                      </label>
                      <textarea
                        value={Array.isArray(input.options) ? input.options.join('\n') : ''}
                        onChange={(e) => updateInput(index, 'options', e.target.value.split('\n').filter(o => o.trim()))}
                        rows={3}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                  )}
                </div>
              ))}

              {inputs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun champ défini</p>
                  <p className="text-sm">Cliquez sur "Ajouter un champ" pour commencer</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sauvegarde..." : step ? "Mettre à jour" : "Créer l'étape"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
