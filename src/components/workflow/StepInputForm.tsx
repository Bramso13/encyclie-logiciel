"use client";

import { StepInput, InputType } from "@/lib/types/workflow";

interface StepInputFormProps {
  inputs: StepInput[];
  values: Record<string, any>;
  onChange: (inputId: string, value: any) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function StepInputForm({ 
  inputs, 
  values, 
  onChange, 
  onSubmit, 
  isSubmitting 
}: StepInputFormProps) {
  
  const renderInput = (input: StepInput) => {
    const value = values[input.id] || '';
    const hasError = input.required && !value;

    switch (input.type) {
      case InputType.TEXT:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(input.id, e.target.value)}
            placeholder={input.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            required={input.required}
          />
        );

      case InputType.TEXTAREA:
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(input.id, e.target.value)}
            placeholder={input.placeholder}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            required={input.required}
          />
        );

      case InputType.SELECT:
        return (
          <select
            value={value}
            onChange={(e) => onChange(input.id, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            required={input.required}
          >
            <option value="">Sélectionner une option</option>
            {input.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case InputType.DATE:
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(input.id, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            required={input.required}
          />
        );

      case InputType.CHECKBOX:
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(input.id, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required={input.required}
            />
            <label className="ml-2 text-sm text-gray-700">
              {input.placeholder || 'Cocher pour confirmer'}
            </label>
          </div>
        );

      case InputType.FILE:
        return (
          <div>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                onChange(input.id, file);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasError ? 'border-red-300' : 'border-gray-300'
              }`}
              required={input.required}
            />
            {value && (
              <p className="mt-1 text-sm text-gray-600">
                Fichier sélectionné: {value.name}
              </p>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(input.id, e.target.value)}
            placeholder={input.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            required={input.required}
          />
        );
    }
  };

  const allRequiredFilled = inputs
    .filter(input => input.required)
    .every(input => {
      const value = values[input.id];
      return value !== undefined && value !== '' && value !== false;
    });

  const hasAnyInput = inputs.length > 0;

  if (!hasAnyInput) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">Aucun champ requis pour cette étape</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Champs à remplir</h3>
        <div className="text-sm text-gray-500">
          {inputs.filter(input => values[input.id]).length} / {inputs.length} remplis
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
        {inputs.map((input) => {
          const hasError = input.required && !values[input.id];
          
          return (
            <div key={input.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {input.label}
                {input.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              
              {renderInput(input)}
              
              {hasError && (
                <p className="mt-1 text-sm text-red-600">
                  Ce champ est obligatoire
                </p>
              )}
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {inputs.filter(input => input.required).length} champ{inputs.filter(input => input.required).length > 1 ? 's' : ''} obligatoire{inputs.filter(input => input.required).length > 1 ? 's' : ''}
          </div>
          
          <button
            type="submit"
            disabled={!allRequiredFilled || isSubmitting}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              allRequiredFilled && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder et continuer'}
          </button>
        </div>
      </form>
    </div>
  );
}
