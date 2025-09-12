"use client";

import { useState, useEffect } from "react";
import useProductsStore from "@/lib/stores/products-store";
import { calculPrimeRCD } from "@/lib/tarificateurs/rcd";
import ActivityBreakdownField from "@/components/quotes/ActivityBreakdown";
import LossHistoryField from "@/components/quotes/LossHistoryField";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FormField {
  [key: string]: {
    help: string;
    type: string;
    label: string;
    required: boolean;
    default?: any;
    options?: Array<{ label: string; value: string; defaillant?: boolean }>;
    validation?: {
      rule: string;
      message: string;
      value?: number;
    };
    max?: number;
    min?: number;
    maxActivities?: number;
    minActivities?: number;
    maxEntries?: number;
    fields?: Array<{
      name: string;
      type: string;
      label: string;
      min?: number;
      max?: number;
    }>;
    conditional?: {
      field: string;
      value: string;
    };
  };
}

interface StepConfig {
  steps: Array<{
    title: string;
    fields: string[];
    description: string;
    includeCompanyInfo?: boolean;
  }>;
}

interface FieldDraft {
  key: string;
  help: string;
  type: string;
  label: string;
  required: boolean;
  default: string;
  max?: string | number;
  min?: string | number;
  options?: Array<{ label: string; value: string; defaillant?: boolean }>;
}

interface DateConstraint {
  type: 'relative' | 'absolute';
  value?: string; // Pour les dates absolues
  period?: number; // Pour les périodes relatives
  unit?: 'days' | 'weeks' | 'months' | 'years'; // Pour les périodes relatives
  direction?: 'before' | 'after'; // Pour les périodes relatives
}

interface ProductConfigTabProps {
  products: any[];
  loading: boolean;
}

// Composant pour un champ sortable dans une étape
interface SortableFieldProps {
  fieldName: string;
  fieldIndex: number;
  stepIndex: number;
  availableFields: string[];
  formFields: FormField;
  onUpdateField: (stepIndex: number, fieldIndex: number, fieldName: string) => void;
  onRemoveField: (stepIndex: number, fieldIndex: number) => void;
}

function SortableField({
  fieldName,
  fieldIndex,
  stepIndex,
  availableFields,
  formFields,
  onUpdateField,
  onRemoveField,
}: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `field-${stepIndex}-${fieldIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 items-center bg-gray-50 p-2 rounded-md border"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
        title="Glisser pour réorganiser"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </div>
      <select
        value={fieldName}
        onChange={(e) => onUpdateField(stepIndex, fieldIndex, e.target.value)}
        className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
      >
        <option value="">Sélectionner un champ...</option>
        {availableFields.map((field) => (
          <option key={field} value={field}>
            {field} - {formFields[field]?.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onRemoveField(stepIndex, fieldIndex)}
        className="text-red-500 hover:text-red-700 text-sm"
        title="Retirer le champ"
      >
        ✕
      </button>
    </div>
  );
}

// Composant pour une étape avec champs sortables
interface StepWithSortableFieldsProps {
  step: {
    title: string;
    description: string;
    fields: string[];
    includeCompanyInfo?: boolean;
  };
  stepIndex: number;
  availableFields: string[];
  formFields: FormField;
  onUpdateField: (stepIndex: number, fieldIndex: number, fieldName: string) => void;
  onAddField: (stepIndex: number) => void;
  onRemoveField: (stepIndex: number, fieldIndex: number) => void;
  onRemoveStep: (stepIndex: number) => void;
  onReorderFields: (stepIndex: number, oldIndex: number, newIndex: number) => void;
}

function StepWithSortableFields({
  step,
  stepIndex,
  availableFields,
  formFields,
  onUpdateField,
  onAddField,
  onRemoveField,
  onRemoveStep,
  onReorderFields,
}: StepWithSortableFieldsProps) {
  // Capteurs pour le drag and drop des champs
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fonction pour gérer le drag and drop des champs
  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;
      
      const activeIndex = parseInt(activeId.split('-')[2]);
      const overIndex = parseInt(overId.split('-')[2]);

      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        onReorderFields(stepIndex, activeIndex, overIndex);
      }
    }
  };

  return (
    <div className="border border-gray-200 rounded-md p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="font-medium text-gray-900">{step.title}</div>
          <div className="text-sm text-gray-600">{step.description}</div>
        </div>
        <button
          onClick={() => onRemoveStep(stepIndex)}
          className="text-red-600 hover:text-red-800 ml-2"
          title="Supprimer l'étape"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-700">Champs de l'étape :</div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFieldDragEnd}
        >
          <SortableContext
            items={step.fields.map((_, fieldIndex) => `field-${stepIndex}-${fieldIndex}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {step.fields.map((fieldName, fieldIndex) => (
                <SortableField
                  key={`field-${stepIndex}-${fieldIndex}`}
                  fieldName={fieldName}
                  fieldIndex={fieldIndex}
                  stepIndex={stepIndex}
                  availableFields={availableFields}
                  formFields={formFields}
                  onUpdateField={onUpdateField}
                  onRemoveField={onRemoveField}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        <button
          onClick={() => onAddField(stepIndex)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          + Ajouter un champ
        </button>
      </div>
    </div>
  );
}

export default function ProductConfigTab({ products, loading }: ProductConfigTabProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [formFields, setFormFields] = useState<FormField>({});
  const [stepConfig, setStepConfig] = useState<StepConfig>({ steps: [] });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [showEditFieldModal, setShowEditFieldModal] = useState(false);

  // État pour le nouveau champ
  const [newField, setNewField] = useState<FieldDraft>({
    key: "",
    help: "",
    type: "text",
    label: "",
    required: false,
    default: "",
    max: undefined,
    min: undefined,
    options: [],
  });

  // État pour l'édition d'un champ
  const [editingFieldData, setEditingFieldData] = useState<FieldDraft>({
    key: "",
    help: "",
    type: "text",
    label: "",
    required: false,
    default: "",
    max: undefined,
    min: undefined,
    options: [],
  });

  // État pour la nouvelle étape
  const [newStep, setNewStep] = useState({
    title: "",
    description: "",
    fields: [] as string[],
    includeCompanyInfo: false,
  });

  const [newSelectOption, setNewSelectOption] = useState<{ label: string; value: string; defaillant?: boolean }>({
    label: "",
    value: "",
    defaillant: false,
  });

  const [editSelectOption, setEditSelectOption] = useState<{ label: string; value: string; defaillant?: boolean }>({
    label: "",
    value: "",
    defaillant: false,
  });

  const [newDateConstraint, setNewDateConstraint] = useState<DateConstraint>({
    type: 'relative',
    period: 1,
    unit: 'months',
    direction: 'before'
  });

  const [editDateConstraint, setEditDateConstraint] = useState<DateConstraint>({
    type: 'relative',
    period: 1,
    unit: 'months',
    direction: 'before'
  });

  // États pour le test en direct de calculPrimeRCD
  const [testParams, setTestParams] = useState({
    caDeclared: 500000,
    etp: 3,
    activites: [] as { code: string; caSharePercent: number }[],
    dateCreation: new Date().toISOString().split('T')[0],
    tempsSansActivite: "NON" as "PLUS_DE_12_MOIS" | "DE 6_A 12_MOIS" | "NON" | "CREATION",
    anneeExperience: 5,
    assureurDefaillant: false,
    nombreAnneeAssuranceContinue: 3,
    qualif: false,

    nomDeLAsurreur: "AXA",
    dateEffet: new Date().toISOString().split('T')[0],
    sinistresPrecedents: [] as { year: number; numClaims: number; totalCost: number }[],
    // Nouveaux paramètres
    sansActiviteDepuisPlusDe12MoisSansFermeture: "NON" as "OUI" | "NON" | "CREATION",
    absenceDeSinistreSurLes5DernieresAnnees: "OUI" as "OUI" | "NON" | "CREATION" | "ASSUREUR_DEFAILLANT" | "A_DEFINIR",
    protectionJuridique: true,
    fractionnementPrime: "annuel" as "annuel" | "mensuel" | "trimestriel" | "semestriel",
    partSoutraitance: 0,
    partNegoce: 0,
    nonFournitureBilanN_1: false,
    reprisePasse: false,
    dateFinCouverturePrecedente: new Date().toISOString().split('T')[0]
  });

  // État pour le mapping des paramètres
  const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({
    enCreation: "",
    caDeclared: "",
    etp: "",
    activites: "",
    dateCreation: "",
    tempsSansActivite: "",
    anneeExperience: "",
    assureurDefaillant: "",
    nombreAnneeAssuranceContinue: "",
    qualif: "",

    nomDeLAsurreur: "",
    dateEffet: "",
    sinistresPrecedents: "",
    // Nouveaux paramètres
    sansActiviteDepuisPlusDe12MoisSansFermeture: "",
    absenceDeSinistreSurLes5DernieresAnnees: "",
    protectionJuridique: "",
    fractionnementPrime: "",
    partSoutraitance: "",
    partNegoce: "",
    nonFournitureBilanN_1: "",
    reprisePasse: "",
    dateFinCouverturePrecedente: ""
  });

  // État pour sauvegarder les valeurs des inputs de test
  const [savedTestValues, setSavedTestValues] = useState<Record<string, any>>({});

  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string>("");

  useEffect(() => {
    if (selectedProduct && products.length > 0) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        setFormFields(product.formFields || {});
        setStepConfig(product.stepConfig || { steps: [] });
        
        // Charger le mapping s'il existe
        if (product.mappingFields) {
          setParameterMapping(product.mappingFields as Record<string, string>);
        }
      }
    }
  }, [selectedProduct, products]);

  // Charger les valeurs sauvegardées depuis le localStorage
  useEffect(() => {
    if (selectedProduct) {
      const savedValues = localStorage.getItem(`testValues_${selectedProduct}`);
      if (savedValues) {
        try {
          setSavedTestValues(JSON.parse(savedValues));
        } catch (error) {
          console.error('Erreur lors du chargement des valeurs sauvegardées:', error);
        }
      }
    }
  }, [selectedProduct]);

  const handleSaveFormFields = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await fetch(`/api/products/${selectedProduct}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formFields }),
      });

      if (response.ok) {
        alert("FormFields sauvegardés avec succès !");
      } else {
        throw new Error("Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la sauvegarde des formFields");
    }
  };

  const handleSaveStepConfig = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await fetch(`/api/products/${selectedProduct}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepConfig }),
      });

      if (response.ok) {
        alert("StepConfig sauvegardé avec succès !");
      } else {
        throw new Error("Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la sauvegarde du stepConfig");
    }
  };

  const addField = () => {
    if (newField.key && newField.label) {
      const fieldData: any = {
        help: newField.help,
        type: newField.type,
        label: newField.label,
        required: newField.required,
      };

      if (newField.default !== "") fieldData.default = newField.default;
      
      // Gestion des contraintes selon le type
      if (newField.type === "date") {
        if (newField.min !== undefined) {
          fieldData.min = newField.min;
        }
        if (newField.max !== undefined) {
          fieldData.max = newField.max;
        }
      } else {
        if (newField.max !== undefined) fieldData.max = newField.max;
        if (newField.min !== undefined) fieldData.min = newField.min;
      }
      
      if (newField.type === "select") fieldData.options = newField.options || [];

      setFormFields(prev => ({
        ...prev,
        [newField.key]: fieldData
      }));

      setNewField({
        key: "",
        help: "",
        type: "text",
        label: "",
        required: false,
        default: "",
        max: undefined,
        min: undefined,
        options: [],
      });
      setShowAddFieldModal(false);
    }
  };

  const startEditField = (fieldKey: string) => {
    const field = (formFields as any)[fieldKey];
    if (!field) return;

    setEditingField(fieldKey);
    setEditingFieldData({
      key: fieldKey,
      help: field.help || "",
      type: field.type || "text",
      label: field.label || "",
      required: !!field.required,
      default: field.default ?? "",
      max: field.max,
      min: field.min,
      options: field.options || [],
    });
    setShowEditFieldModal(true);
  };

  const saveEditedField = () => {
    if (!editingField) return;

    const oldKey = editingField;
    const newKey = editingFieldData.key.trim();
    if (!newKey || !editingFieldData.label.trim()) return;

    const updatedField: any = {
      help: editingFieldData.help,
      type: editingFieldData.type,
      label: editingFieldData.label,
      required: editingFieldData.required,
    };
    if (editingFieldData.default !== "") updatedField.default = editingFieldData.default;
    
    // Gestion des contraintes selon le type
    if (editingFieldData.type === "date") {
      if (editingFieldData.min !== undefined) {
        updatedField.min = editingFieldData.min;
      }
      if (editingFieldData.max !== undefined) {
        updatedField.max = editingFieldData.max;
      }
    } else {
      if (editingFieldData.max !== undefined) updatedField.max = editingFieldData.max;
      if (editingFieldData.min !== undefined) updatedField.min = editingFieldData.min;
    }
    
    if (editingFieldData.type === "select") updatedField.options = editingFieldData.options || [];

    // Mettre à jour formFields
    const newFormFields: any = { ...formFields };
    if (oldKey !== newKey) {
      delete newFormFields[oldKey];
    }
    newFormFields[newKey] = updatedField;
    setFormFields(newFormFields);

    // Mettre à jour stepConfig si la clé a changé
    if (oldKey !== newKey) {
      const newStepConfig = {
        ...stepConfig,
        steps: stepConfig.steps.map((step) => ({
          ...step,
          fields: step.fields.map((f) => (f === oldKey ? newKey : f)),
        })),
      };
      setStepConfig(newStepConfig);
    }

    setShowEditFieldModal(false);
    setEditingField(null);
  };

  const removeField = (fieldKey: string) => {
    const newFormFields = { ...formFields };
    delete newFormFields[fieldKey];
    setFormFields(newFormFields);

    // Mettre à jour stepConfig pour retirer les références
    const newStepConfig = {
      ...stepConfig,
      steps: stepConfig.steps.map(step => ({
        ...step,
        fields: step.fields.filter(field => field !== fieldKey)
      }))
    };
    setStepConfig(newStepConfig);
  };

  const addStep = () => {
    if (newStep.title && newStep.description) {
      setStepConfig(prev => ({
        ...prev,
        steps: [...prev.steps, newStep]
      }));

      setNewStep({
        title: "",
        description: "",
        fields: [],
        includeCompanyInfo: false,
      });
      setShowAddStepModal(false);
    }
  };

  const removeStep = (stepIndex: number) => {
    setStepConfig(prev => ({
      ...prev,
      steps: prev.steps.filter((_, index) => index !== stepIndex)
    }));
  };

  const updateFieldInStep = (stepIndex: number, fieldIndex: number, fieldName: string) => {
    const newStepConfig = { ...stepConfig };
    newStepConfig.steps[stepIndex].fields[fieldIndex] = fieldName;
    setStepConfig(newStepConfig);
  };

  const addFieldToStep = (stepIndex: number) => {
    const newStepConfig = { ...stepConfig };
    newStepConfig.steps[stepIndex].fields.push("");
    setStepConfig(newStepConfig);
  };

  const removeFieldFromStep = (stepIndex: number, fieldIndex: number) => {
    const newStepConfig = { ...stepConfig };
    newStepConfig.steps[stepIndex].fields.splice(fieldIndex, 1);
    setStepConfig(newStepConfig);
  };

  const availableFields = Object.keys(formFields);

  // Fonction pour réorganiser les champs dans une étape
  const reorderFields = (stepIndex: number, oldIndex: number, newIndex: number) => {
    setStepConfig(prev => {
      const newStepConfig = { ...prev };
      const step = newStepConfig.steps[stepIndex];
      const newFields = arrayMove(step.fields, oldIndex, newIndex);
      newStepConfig.steps[stepIndex] = { ...step, fields: newFields };
      return newStepConfig;
    });
  };

  // Fonction pour appliquer le mapping automatiquement
  const applyMapping = () => {
    const newTestParams = { ...testParams };
    console.log("formFields", formFields);
    
    Object.entries(parameterMapping).forEach(([paramKey, fieldKey]) => {

      if (fieldKey && formFields[fieldKey]) {
        const field = formFields[fieldKey];
        
        // Conversion selon le type de champ
        switch (paramKey) {
          case 'enCreation':
              if (field.type === 'checkbox') {
                (newTestParams as any)[paramKey] = Boolean(field.default);
              }
              break;
          case 'caDeclared':
          case 'etp':
          case 'anneeExperience':
          case 'nombreAnneeAssuranceContinue':

          case 'tauxTI':
          case 'coefficientAntecedent':
            if (field.type === 'number') {
              (newTestParams as any)[paramKey] = field.default || 0;
            }
            break;
            
          case 'dateCreation':
          case 'dateEffet':
          case 'dateFinCouverturePrecedente':
            if (field.type === 'date') {
              (newTestParams as any)[paramKey] = field.default || new Date().toISOString().split('T')[0];
            }
            break;
            
          case 'tempsSansActivite':
            if (field.type === 'select' && field.options) {
              (newTestParams as any)[paramKey] = field.options[0]?.value || "NON";
            }
            break;
            
          case 'qualif':
          case 'assureurDefaillant':
          case 'activiteSansEtreAssure':
            if (field.type === 'checkbox') {
              (newTestParams as any)[paramKey] = field.default || false;
            }
            break;
            
          case 'nomDeLAsurreur':
          case 'ancienneAssurance':
            if (field.type === 'text' || field.type === 'select') {
              (newTestParams as any)[paramKey] = field.default || "";
            }
            break;
        }
      }
    });
    
    setTestParams(newTestParams);
  };

  // Fonction pour sauvegarder le mapping
  const saveMapping = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await fetch(`/api/products/${selectedProduct}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mappingFields: parameterMapping
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde du mapping');
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Mapping sauvegardé avec succès !');
      } else {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du mapping');
    }
  };

  // Fonction pour charger le mapping
  const loadMapping = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await fetch(`/api/products/${selectedProduct}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du mapping');
      }

      const result = await response.json();
      
      if (result.success && result.data.mappingFields) {
        setParameterMapping(result.data.mappingFields);
        alert('Mapping chargé avec succès !');
      } else {
        alert('Aucun mapping sauvegardé pour ce produit');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur lors du chargement du mapping');
    }
  };

  // Fonction pour sauvegarder les valeurs des inputs de test
  const saveTestValues = () => {
    if (!selectedProduct) return;
    
    const valuesToSave: Record<string, any> = {};
    
    // Collecter les valeurs des champs mappés
    Object.entries(parameterMapping).forEach(([paramKey, fieldKey]) => {
      if (fieldKey && formFields[fieldKey]) {
        const field = formFields[fieldKey];
        valuesToSave[fieldKey] = field.default;
      }
    });
    
    // Ajouter les valeurs spéciales (activités et sinistres)
    valuesToSave.activites = testParams.activites;
    valuesToSave.sinistresPrecedents = testParams.sinistresPrecedents;
    
    setSavedTestValues(valuesToSave);
    localStorage.setItem(`testValues_${selectedProduct}`, JSON.stringify(valuesToSave));
    alert('Valeurs de test sauvegardées avec succès !');
  };

  // Fonction pour charger les valeurs des inputs de test
  const loadTestValues = () => {
    if (!selectedProduct) return;
    
    const savedValues = localStorage.getItem(`testValues_${selectedProduct}`);
    if (savedValues) {
      try {
        const values = JSON.parse(savedValues);
        setSavedTestValues(values);
        
        // Appliquer les valeurs aux champs formFields
        const newFormFields = { ...formFields };
        Object.entries(values).forEach(([fieldKey, value]) => {
          if (newFormFields[fieldKey] && fieldKey !== 'activites' && fieldKey !== 'sinistresPrecedents') {
            newFormFields[fieldKey] = { ...newFormFields[fieldKey], default: value };
          }
        });
        setFormFields(newFormFields);
        
        // Appliquer les valeurs spéciales
        if (values.activites) {
          setTestParams(prev => ({ ...prev, activites: values.activites }));
        }
        if (values.sinistresPrecedents) {
          setTestParams(prev => ({ ...prev, sinistresPrecedents: values.sinistresPrecedents }));
        }
        
        alert('Valeurs de test chargées avec succès !');
      } catch (error) {
        console.error('Erreur lors du chargement des valeurs:', error);
        alert('Erreur lors du chargement des valeurs sauvegardées');
      }
    } else {
      alert('Aucune valeur sauvegardée pour ce produit');
    }
  };

  // Fonction pour effacer les valeurs sauvegardées
  const clearTestValues = () => {
    if (!selectedProduct) return;
    
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les valeurs sauvegardées ?')) {
      localStorage.removeItem(`testValues_${selectedProduct}`);
      setSavedTestValues({});
      alert('Valeurs effacées avec succès !');
    }
  };

  // Fonction de test en direct basée sur les mappings
  const runTest = () => {
    try {
      setTestError("");
      
      // Construire les paramètres uniquement à partir des mappings
      const mappedParams: any = {};
      
      Object.entries(parameterMapping).forEach(([paramKey, fieldKey]) => {
        if (fieldKey && formFields[fieldKey]) {
          const field = formFields[fieldKey];
          
          // Conversion selon le type de champ
          switch (paramKey) {
            case 'enCreation':
              if (field.type === 'checkbox') {
                mappedParams[paramKey] = field.default || false;
              }
              break;
            case 'caDeclared':
            case 'etp':
            case 'anneeExperience':
            case 'nombreAnneeAssuranceContinue':

            case 'partSoutraitance':
            case 'partNegoce':
              if (field.type === 'number') {
                mappedParams[paramKey] = field.default || 0;
              }
              break;
              
            case 'dateCreation':
            case 'dateEffet':
              if (field.type === 'date') {
                mappedParams[paramKey] = field.default ? new Date(field.default) : new Date();
              }
              break;
              
            case 'tempsSansActivite':
              console.log("field", field);
              mappedParams[paramKey] = field.default;
              break;
            case 'sansActiviteDepuisPlusDe12MoisSansFermeture':
            case 'absenceDeSinistreSurLes5DernieresAnnees':
            case 'fractionnementPrime':
              mappedParams[paramKey] = field.default;
              break;
              
            case 'qualif':
            case 'assureurDefaillant':
            case 'protectionJuridique':
            case 'nonFournitureBilanN_1':
            case 'reprisePasse':
              if (field.type === 'checkbox') {
                mappedParams[paramKey] = field.default || false;
              }
              break;
              
            case 'nomDeLAsurreur':
              if (field.type === 'text' || field.type === 'select') {
                mappedParams[paramKey] = field.default || "";
              }
              break;
              
            case 'activites':
              // Pour les activités, on utilise toujours les valeurs de testParams
              mappedParams[paramKey] = testParams.activites.map(a => ({
                code: parseInt(a.code),
                caSharePercent: a.caSharePercent
              }));
              break;

            case 'dateFinCouverturePrecedente':
              if (field.type === 'date') {
                mappedParams[paramKey] = field.default ? new Date(field.default) : new Date();
              }
              break;
              
            case 'sinistresPrecedents':
              // Pour les sinistres, on utilise toujours les valeurs de testParams
              mappedParams[paramKey] = testParams.sinistresPrecedents;
              break;
          }
        }
      });
      
      // Vérifier que tous les paramètres obligatoires sont présents
      const requiredParams = ['caDeclared', 'etp', 'activites'];
      const missingParams = requiredParams.filter(param => !mappedParams[param]);
      
      if (missingParams.length > 0) {
        throw new Error(`Paramètres obligatoires manquants : ${missingParams.join(', ')}`);
      }

      console.log("mappedParams", mappedParams);
      
      // Utiliser les valeurs par défaut pour les paramètres non mappés
      const finalParams = {
        // Valeurs par défaut
        caDeclared: 500000,
        etp: 3,
        activites: [],
        dateCreation: new Date(),
        tempsSansActivite: "NON" as any,
        anneeExperience: 5,
        assureurDefaillant: false,
        nombreAnneeAssuranceContinue: 3,
        qualif: false,

        nomDeLAsurreur: "AXA",
        dateEffet: new Date(),
        sinistresPrecedents: [],
        // Nouveaux paramètres avec valeurs par défaut
        sansActiviteDepuisPlusDe12MoisSansFermeture: "NON" as "OUI" | "NON" | "CREATION",
        absenceDeSinistreSurLes5DernieresAnnees: "OUI" as "OUI" | "NON" | "CREATION" | "ASSUREUR_DEFAILLANT" | "A_DEFINIR",
        protectionJuridique: true,
        fractionnementPrime: "annuel" as "annuel" | "mensuel" | "trimestriel" | "semestriel",
        partSoutraitance: 0,
        partNegoce: 0,
        nonFournitureBilanN_1: false,
        reprisePasse: false,
        // Remplacer par les valeurs mappées
        ...mappedParams
      };

      const result = calculPrimeRCD(finalParams);
      setTestResult(result);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Erreur inconnue");
      setTestResult(null);
    }
  };

  // Options pour les activités (basées sur le tableau dans rcd.ts)
  const activityOptions = [
    { label: "Code 1 - Voiries Réseaux Divers (VRD)", value: "1" },
    { label: "Code 2 - Maçonnerie et béton armé", value: "2" },
    { label: "Code 3 - Charpente et structure en bois", value: "3" },
    { label: "Code 4 - Charpente et structure métallique", value: "4" },
    { label: "Code 5 - Couverture", value: "5" },
    { label: "Code 6 - Menuiseries extérieures bois et PVC", value: "6" },
    { label: "Code 7 - Menuiseries extérieures métalliques", value: "7" },
    { label: "Code 8 - Bardages de façades", value: "8" },
    { label: "Code 9 - Menuiseries intérieures", value: "9" },
    { label: "Code 10 - Plâtrerie – Staff – Stuc – Gypserie", value: "10" },
    { label: "Code 11 - Serrurerie - Métallerie", value: "11" },
    { label: "Code 12 - Vitrerie - Miroiterie", value: "12" },
    { label: "Code 13 - Peinture", value: "13" },
    { label: "Code 14 - Revêtement intérieur de surfaces en matériaux souples et parquets", value: "14" },
    { label: "Code 15 - Revêtement de surfaces en matériaux durs - Chapes et sols coulés", value: "15" },
    { label: "Code 16 - Isolation thermique et acoustique", value: "16" },
    { label: "Code 17 - Plomberie", value: "17" },
    { label: "Code 18 - Installations thermiques de génie climatique", value: "18" },
    { label: "Code 19 - Installations d'aéraulique et de conditionnement d'air", value: "19" },
    { label: "Code 20 - Electricité -Télécommunications", value: "20" }
  ];

  // Fonction pour obtenir la description des paramètres
  const getParamDescription = (paramKey: string): string => {
    const descriptions: Record<string, string> = {
      caDeclared: "Chiffre d'affaires déclaré en euros",
      etp: "Effectif en équivalents temps plein (1-8)",
      activites: "Répartition des activités avec codes et pourcentages",
      dateCreation: "Date de création de l'entreprise",
      tempsSansActivite: "Période sans activité avant l'assurance",
      anneeExperience: "Années d'expérience du dirigeant",
      assureurDefaillant: "Si l'assureur précédent est défaillant",
      nombreAnneeAssuranceContinue: "Nombre d'années d'assurance continue",
      qualif: "Qualification QUALIBAT/QUALIFELEC",

      nomDeLAsurreur: "Nom de l'assureur actuel",
      dateEffet: "Date d'effet du nouveau contrat",
      sinistresPrecedents: "Historique des sinistres des 5 dernières années",
      // Nouveaux paramètres
      sansActiviteDepuisPlusDe12MoisSansFermeture: "Sans activité depuis plus de 12 mois sans fermeture",
      absenceDeSinistreSurLes5DernieresAnnees: "Absence de sinistre sur les 5 dernières années",
      protectionJuridique: "Protection juridique incluse",
      fractionnementPrime: "Fractionnement de la prime (annuel/mensuel/trimestriel/semestriel)",
      partSoutraitance: "Part de sous-traitance (%)",
      partNegoce: "Part de négoce (%)",
      nonFournitureBilanN_1: "Non fourniture du bilan N-1",
      reprisePasse: "Reprise du passé activée"
    };
    return descriptions[paramKey] || "Paramètre de la fonction calculPrimeRCD";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sélection du produit */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Configuration des produits d'assurance
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un produit
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Choisir un produit...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="text-sm text-gray-600">
            Produit sélectionné : {products.find(p => p.id === selectedProduct)?.name}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gestion des FormFields */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">
                Champs du formulaire (FormFields)
              </h4>
              <button
                onClick={() => setShowAddFieldModal(true)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                + Ajouter un champ
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(formFields).map(([key, field]) => (
                <div key={key} className="border border-gray-200 rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => startEditField(key)}>
                      <div className="font-medium text-gray-900">{key}</div>
                      <div className="text-sm text-gray-600">
                        {field.label} ({field.type})
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      {field.help && (
                        <div className="text-xs text-gray-500 mt-1">{field.help}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeField(key); }}
                      className="text-red-600 hover:text-red-800 ml-2"
                      title="Supprimer le champ"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={handleSaveFormFields}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                Sauvegarder FormFields
              </button>
            </div>
          </div>

          {/* Gestion des StepConfig */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">
                
                
              </h4>
              <button
                onClick={() => setShowAddStepModal(true)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                + Ajouter une étape
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {stepConfig.steps.map((step, stepIndex) => (
                <StepWithSortableFields
                  key={stepIndex}
                  step={step}
                  stepIndex={stepIndex}
                  availableFields={availableFields}
                  formFields={formFields}
                  onUpdateField={updateFieldInStep}
                  onAddField={addFieldToStep}
                  onRemoveField={removeFieldFromStep}
                  onRemoveStep={removeStep}
                  onReorderFields={reorderFields}
                />
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={handleSaveStepConfig}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                Sauvegarder StepConfig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour ajouter un champ */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Ajouter un nouveau champ
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clé du champ</label>
                  <input
                    type="text"
                    value={newField.key}
                    onChange={(e) => setNewField(prev => ({ ...prev, key: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="ex: companyName"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Label</label>
                  <input
                    type="text"
                    value={newField.label}
                    onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="ex: Nom de l'entreprise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="text">Texte</option>
                    <option value="email">Email</option>
                    <option value="tel">Téléphone</option>
                    <option value="number">Nombre</option>
                    <option value="date">Date</option>
                    <option value="select">Sélection</option>
                    <option value="checkbox">Case à cocher</option>
                    <option value="textarea">Zone de texte</option>
                  </select>
                </div>

                {newField.type === "select" && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700">Options</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(newField.options || []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 text-sm">{opt.label} — {opt.value}</div>
                          <button
                            onClick={() => setNewField(prev => ({
                              ...prev,
                              options: (prev.options || []).filter((_, i) => i !== idx),
                            }))}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Label"
                        value={newSelectOption.label}
                        onChange={(e) => setNewSelectOption(prev => ({ ...prev, label: e.target.value }))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm col-span-1"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={newSelectOption.value}
                        onChange={(e) => setNewSelectOption(prev => ({ ...prev, value: e.target.value }))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm col-span-1"
                      />
                      <button
                        onClick={() => {
                          if (!newSelectOption.label || !newSelectOption.value) return;
                          setNewField(prev => ({
                            ...prev,
                            options: [ ...(prev.options || []), newSelectOption ],
                          }));
                          setNewSelectOption({ label: "", value: "", defaillant: false });
                        }}
                        className="text-white bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm px-3 py-1 col-span-1"
                      >
                        + Ajouter option
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Aide</label>
                  <textarea
                    value={newField.help}
                    onChange={(e) => setNewField(prev => ({ ...prev, help: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Texte d'aide pour l'utilisateur"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Champ obligatoire</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valeur par défaut</label>
                    <input
                      type="text"
                      value={newField.default}
                      onChange={(e) => setNewField(prev => ({ ...prev, default: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Valeur par défaut"
                    />
                  </div>
                </div>

                {/* Champs min/max selon le type */}
                {(newField.type === "number" || newField.type === "text") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Valeur min</label>
                      <input
                        type={newField.type === "number" ? "number" : "text"}
                        value={newField.min || ""}
                        onChange={(e) => setNewField(prev => ({ 
                          ...prev, 
                          min: newField.type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined 
                        }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder={newField.type === "number" ? "Min" : "Longueur min"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Valeur max</label>
                      <input
                        type={newField.type === "number" ? "number" : "text"}
                        value={newField.max || ""}
                        onChange={(e) => setNewField(prev => ({ 
                          ...prev, 
                          max: newField.type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined 
                        }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder={newField.type === "number" ? "Max" : "Longueur max"}
                      />
                    </div>
                  </div>
                )}

                {/* Contraintes de date */}
                {newField.type === "date" && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-700">Contraintes de date</div>
                    
                    {/* Contrainte min */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Date minimum</label>
                      <div className="flex gap-2">
                        <select
                          value={newDateConstraint.type}
                          onChange={(e) => setNewDateConstraint(prev => ({ ...prev, type: e.target.value as 'relative' | 'absolute' }))}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                          <option value="relative">Période relative</option>
                          <option value="absolute">Date fixe</option>
                        </select>
                        
                        {newDateConstraint.type === 'relative' ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              value={newDateConstraint.period || 1}
                              onChange={(e) => setNewDateConstraint(prev => ({ ...prev, period: Number(e.target.value) }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm w-20"
                            />
                            <select
                              value={newDateConstraint.unit}
                              onChange={(e) => setNewDateConstraint(prev => ({ ...prev, unit: e.target.value as 'days' | 'weeks' | 'months' | 'years' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="days">Jours</option>
                              <option value="weeks">Semaines</option>
                              <option value="months">Mois</option>
                              <option value="years">Années</option>
                            </select>
                            <select
                              value={newDateConstraint.direction}
                              onChange={(e) => setNewDateConstraint(prev => ({ ...prev, direction: e.target.value as 'before' | 'after' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="before">Avant</option>
                              <option value="after">Après</option>
                            </select>
                          </>
                        ) : (
                          <input
                            type="date"
                            value={newDateConstraint.value || ""}
                            onChange={(e) => setNewDateConstraint(prev => ({ ...prev, value: e.target.value }))}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    </div>

                    {/* Contrainte max */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Date maximum</label>
                      <div className="flex gap-2">
                        <select
                          value={newDateConstraint.type}
                          onChange={(e) => setNewDateConstraint(prev => ({ ...prev, type: e.target.value as 'relative' | 'absolute' }))}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                          <option value="relative">Période relative</option>
                          <option value="absolute">Date fixe</option>
                        </select>
                        
                        {newDateConstraint.type === 'relative' ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              value={newDateConstraint.period || 1}
                              onChange={(e) => setNewDateConstraint(prev => ({ ...prev, period: Number(e.target.value) }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm w-20"
                            />
                            <select
                              value={newDateConstraint.unit}
                              onChange={(e) => setNewDateConstraint(prev => ({ ...prev, unit: e.target.value as 'days' | 'weeks' | 'months' | 'years' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="days">Jours</option>
                              <option value="weeks">Semaines</option>
                              <option value="months">Mois</option>
                              <option value="years">Années</option>
                            </select>
                            <select
                              value={newDateConstraint.direction}
                              onChange={(e) => setNewDateConstraint(prev => ({ ...prev, direction: e.target.value as 'before' | 'after' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="before">Avant</option>
                              <option value="after">Après</option>
                            </select>
                          </>
                        ) : (
                          <input
                            type="date"
                            value={newDateConstraint.value || ""}
                            onChange={(e) => setNewDateConstraint(prev => ({ ...prev, value: e.target.value }))}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddFieldModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={addField}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour ajouter une étape */}
      {showAddStepModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Ajouter une nouvelle étape
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titre de l'étape</label>
                  <input
                    type="text"
                    value={newStep.title}
                    onChange={(e) => setNewStep(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="ex: Informations de base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newStep.description}
                    onChange={(e) => setNewStep(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Description de l'étape pour l'utilisateur"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStep.includeCompanyInfo}
                    onChange={(e) => setNewStep(prev => ({ ...prev, includeCompanyInfo: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Inclure les informations de l'entreprise</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddStepModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={addStep}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour éditer un champ */}
      {showEditFieldModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Modifier le champ
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clé du champ</label>
                  <input
                    type="text"
                    value={editingFieldData.key}
                    onChange={(e) => setEditingFieldData(prev => ({ ...prev, key: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="ex: companyName"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Label</label>
                  <input
                    type="text"
                    value={editingFieldData.label}
                    onChange={(e) => setEditingFieldData(prev => ({ ...prev, label: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="ex: Nom de l'entreprise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={editingFieldData.type}
                    onChange={(e) => setEditingFieldData(prev => ({ ...prev, type: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="text">Texte</option>
                    <option value="email">Email</option>
                    <option value="tel">Téléphone</option>
                    <option value="number">Nombre</option>
                    <option value="date">Date</option>
                    <option value="select">Sélection</option>
                    <option value="checkbox">Case à cocher</option>
                    <option value="textarea">Zone de texte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Aide</label>
                  <textarea
                    value={editingFieldData.help}
                    onChange={(e) => setEditingFieldData(prev => ({ ...prev, help: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Texte d'aide pour l'utilisateur"
                  />
                </div>

                {editingFieldData.type === "select" && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700">Options</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(editingFieldData.options || []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 text-sm">{opt.label} — {opt.value}</div>
                          <button
                            onClick={() => setEditingFieldData(prev => ({
                              ...prev,
                              options: (prev.options || []).filter((_, i) => i !== idx),
                            }))}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Label"
                        value={editSelectOption.label}
                        onChange={(e) => setEditSelectOption(prev => ({ ...prev, label: e.target.value }))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm col-span-1"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={editSelectOption.value}
                        onChange={(e) => setEditSelectOption(prev => ({ ...prev, value: e.target.value }))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm col-span-1"
                      />
                      <button
                        onClick={() => {
                          if (!editSelectOption.label || !editSelectOption.value) return;
                          setEditingFieldData(prev => ({
                            ...prev,
                            options: [ ...(prev.options || []), editSelectOption ],
                          }));
                          setEditSelectOption({ label: "", value: "", defaillant: false });
                        }}
                        className="text-white bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm px-3 py-1 col-span-1"
                      >
                        + Ajouter option
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingFieldData.required}
                    onChange={(e) => setEditingFieldData(prev => ({ ...prev, required: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Champ obligatoire</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valeur par défaut</label>
                    <input
                      type="text"
                      value={editingFieldData.default}
                      onChange={(e) => setEditingFieldData(prev => ({ ...prev, default: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Valeur par défaut"
                    />
                  </div>
                </div>

                {/* Champs min/max selon le type */}
                {(editingFieldData.type === "number" || editingFieldData.type === "text") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Valeur min</label>
                      <input
                        type={editingFieldData.type === "number" ? "number" : "text"}
                        value={editingFieldData.min || ""}
                        onChange={(e) => setEditingFieldData(prev => ({ 
                          ...prev, 
                          min: editingFieldData.type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined 
                        }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder={editingFieldData.type === "number" ? "Min" : "Longueur min"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Valeur max</label>
                      <input
                        type={editingFieldData.type === "number" ? "number" : "text"}
                        value={editingFieldData.max || ""}
                        onChange={(e) => setEditingFieldData(prev => ({ 
                          ...prev, 
                          max: editingFieldData.type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined 
                        }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder={editingFieldData.type === "number" ? "Max" : "Longueur max"}
                      />
                    </div>
                  </div>
                )}

                {/* Contraintes de date */}
                {editingFieldData.type === "date" && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-700">Contraintes de date</div>
                    
                    {/* Contrainte min */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Date minimum</label>
                      <div className="flex gap-2">
                        <select
                          value={editDateConstraint.type}
                          onChange={(e) => setEditDateConstraint(prev => ({ ...prev, type: e.target.value as 'relative' | 'absolute' }))}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                          <option value="relative">Période relative</option>
                          <option value="absolute">Date fixe</option>
                        </select>
                        
                        {editDateConstraint.type === 'relative' ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              value={editDateConstraint.period || 1}
                              onChange={(e) => setEditDateConstraint(prev => ({ ...prev, period: Number(e.target.value) }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm w-20"
                            />
                            <select
                              value={editDateConstraint.unit}
                              onChange={(e) => setEditDateConstraint(prev => ({ ...prev, unit: e.target.value as 'days' | 'weeks' | 'months' | 'years' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="days">Jours</option>
                              <option value="weeks">Semaines</option>
                              <option value="months">Mois</option>
                              <option value="years">Années</option>
                            </select>
                            <select
                              value={editDateConstraint.direction}
                              onChange={(e) => setEditDateConstraint(prev => ({ ...prev, direction: e.target.value as 'before' | 'after' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="before">Avant</option>
                              <option value="after">Après</option>
                            </select>
                          </>
                        ) : (
                          <input
                            type="date"
                            value={editDateConstraint.value || ""}
                            onChange={(e) => setEditDateConstraint(prev => ({ ...prev, value: e.target.value }))}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    </div>

                    {/* Contrainte max */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Date maximum</label>
                      <div className="flex gap-2">
                        <select
                          value={editDateConstraint.type}
                          onChange={(e) => setEditDateConstraint(prev => ({ ...prev, type: e.target.value as 'relative' | 'absolute' }))}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                          <option value="relative">Période relative</option>
                          <option value="absolute">Date fixe</option>
                        </select>
                        
                        {editDateConstraint.type === 'relative' ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              value={editDateConstraint.period || 1}
                              onChange={(e) => setEditDateConstraint(prev => ({ ...prev, period: Number(e.target.value) }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm w-20"
                            />
                            <select
                              value={editDateConstraint.unit}
                              onChange={(e) => setEditDateConstraint(prev => ({ ...prev, unit: e.target.value as 'days' | 'weeks' | 'months' | 'years' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="days">Jours</option>
                              <option value="weeks">Semaines</option>
                              <option value="months">Mois</option>
                              <option value="years">Années</option>
                            </select>
                            <select
                              value={editDateConstraint.direction}
                              onChange={(e) => setEditDateConstraint(prev => ({ ...prev, direction: e.target.value as 'before' | 'after' }))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="before">Avant</option>
                              <option value="after">Après</option>
                            </select>
                          </>
                        ) : (
                          <input
                            type="date"
                            value={editDateConstraint.value || ""}
                            onChange={(e) => setEditDateConstraint(prev => ({ ...prev, value: e.target.value }))}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => { setShowEditFieldModal(false); setEditingField(null); }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={saveEditedField}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section de mapping des paramètres */}
      {selectedProduct && (
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Mapping des paramètres FormFields → calculPrimeRCD
          </h4>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Mappez manuellement chaque paramètre de la fonction calculPrimeRCD vers un champ de votre formulaire.
            </div>
            
            {/* Interface de mapping */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Paramètres de la fonction */}
              <div>
                <h5 className="text-md font-medium text-gray-900 mb-3">Paramètres de calculPrimeRCD</h5>
                <div className="space-y-3">
                  {Object.keys(parameterMapping).map((paramKey) => (
                    <div key={paramKey} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {paramKey}
                        </label>
                        <div className="text-xs text-gray-500">
                          {getParamDescription(paramKey)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <select
                          value={parameterMapping[paramKey]}
                          onChange={(e) => setParameterMapping(prev => ({ ...prev, [paramKey]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                          <option value="">Aucun mapping</option>
                          {availableFields.map((fieldKey) => (
                            <option key={fieldKey} value={fieldKey}>
                              {fieldKey} - {formFields[fieldKey]?.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Champs disponibles */}
              <div>
                <h5 className="text-md font-medium text-gray-900 mb-3">Champs disponibles dans FormFields</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableFields.map((fieldKey) => {
                    const field = formFields[fieldKey];
                    return (
                      <div key={fieldKey} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="font-medium text-sm text-gray-900">{fieldKey}</div>
                        <div className="text-sm text-gray-600">{field?.label}</div>
                        <div className="text-xs text-gray-500">
                          Type: {field?.type}
                          {field?.required && <span className="text-red-500 ml-2">*</span>}
                        </div>
                        {field?.help && (
                          <div className="text-xs text-gray-500 mt-1">{field.help}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={applyMapping}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                Appliquer le mapping
              </button>
              <button
                onClick={() => setParameterMapping(Object.fromEntries(Object.keys(parameterMapping).map(key => [key, ""])))}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                Réinitialiser le mapping
              </button>
              <button
                onClick={saveMapping}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Sauvegarder le mapping
              </button>
              <button
                onClick={loadMapping}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                Charger le mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section de test en direct de la fonction calculPrimeRCD */}
      {selectedProduct && (
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Test en direct de la fonction calculPrimeRCD
          </h4>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Mappez vos champs de formulaire vers les paramètres de la fonction de calcul et testez en direct.
            </div>
            
            {/* Interface de test en direct basée sur les mappings */}
            <div className="space-y-6">
              {/* Résumé des paramètres mappés */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h5 className="text-md font-medium text-blue-900 mb-3">Paramètres qui seront utilisés pour le test</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(parameterMapping).map(([paramKey, fieldKey]) => {
                    if (!fieldKey) return null;
                    
                    const field = formFields[fieldKey];
                    if (!field) return null;
                    
                    return (
                      <div key={paramKey} className="bg-white p-3 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-800">{paramKey}</div>
                        <div className="text-xs text-blue-600 mb-1">Mappé vers: {fieldKey}</div>
                        <div className="text-sm text-gray-900">
                          {field.type === 'checkbox' ? (field.default ? 'OUI' : 'NON') :
                           field.type === 'date' ? (field.default || 'Date actuelle') :
                           field.type === 'select' && field.options ? (field.options[0]?.label || field.options[0]?.value || 'Première option') :
                           field.default !== undefined ? field.default : 'Valeur par défaut'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {Object.values(parameterMapping).every(v => !v) && (
                  <div className="text-center text-blue-600 text-sm mt-4">
                    Aucun paramètre mappé. Configurez d'abord le mapping ci-dessus.
                  </div>
                )}
              </div>

              {/* Inputs pour les paramètres mappés */}
              <div>
                <h5 className="text-md font-medium text-gray-900 mb-3">Configuration des paramètres mappés</h5>
                <div className="text-sm text-gray-600 mb-4">
                  Configurez les valeurs pour les paramètres qui ont été mappés vers des champs FormFields.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(parameterMapping).map(([paramKey, fieldKey]) => {
                    if (!fieldKey) return null;
                    
                    const field = formFields[fieldKey];
                    if (!field) return null;
                    
                    return (
                      <div key={paramKey} className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {getParamDescription(paramKey)}
                        </label>
                        <div className="text-xs text-gray-500 mb-2">Mappé vers: {fieldKey}</div>
                        
                        {/* Input selon le type de champ */}
                        {field.type === 'number' && (
                          <input
                            type="number"
                            value={field.default || ''}
                            onChange={(e) => {
                              const newValue = Number(e.target.value);
                              setFormFields(prev => ({
                                ...prev,
                                [fieldKey]: { ...prev[fieldKey], default: newValue }
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="0"
                          />
                        )}
                        
                        {field.type === 'date' && (
                          <input
                            type="date"
                            value={field.default || ''}
                            onChange={(e) => {
                              setFormFields(prev => ({
                                ...prev,
                                [fieldKey]: { ...prev[fieldKey], default: e.target.value }
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        )}
                        
                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={field.default || ''}
                            onChange={(e) => {
                              setFormFields(prev => ({
                                ...prev,
                                [fieldKey]: { ...prev[fieldKey], default: e.target.value }
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Texte"
                          />
                        )}
                        
                        {field.type === 'checkbox' && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={field.default || false}
                              onChange={(e) => {
                                setFormFields(prev => ({
                                  ...prev,
                                  [fieldKey]: { ...prev[fieldKey], default: e.target.checked }
                                }));
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Activé</span>
                          </label>
                        )}
                        
                        {field.type === 'select' && field.options && (
                          <select
                            value={field.default || ''}
                            onChange={(e) => {
                              setFormFields(prev => ({
                                ...prev,
                                [fieldKey]: { ...prev[fieldKey], default: e.target.value }
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="">Sélectionner...</option>
                            {field.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {/* Input spécial pour les activités */}
                        {paramKey === 'activites' && (
                          <div className="mt-2">
                            <ActivityBreakdownField
                              options={activityOptions}
                              value={testParams.activites}
                              onChange={(value) => setTestParams(prev => ({ ...prev, activites: value }))}
                            />
                          </div>
                        )}
                        
                        {/* Input spécial pour les sinistres */}
                        {paramKey === 'sinistresPrecedents' && (
                          <div className="mt-2">
                            <LossHistoryField
                              fields={[
                                { name: "year", label: "Année", type: "number", min: 2020, max: 2025 },
                                { name: "numClaims", label: "Nombre de sinistres", type: "number", min: 1, max: 10 },
                                { name: "totalCost", label: "Coût total (€)", type: "number", min: 0 }
                              ]}
                              maxEntries={5}
                              value={testParams.sinistresPrecedents}
                              onChange={(value) => setTestParams(prev => ({ ...prev, sinistresPrecedents: value }))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {Object.values(parameterMapping).every(v => !v) && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Aucun paramètre mappé. Configurez d'abord le mapping ci-dessus.
                  </div>
                )}
              </div>



              {/* Indicateur de valeurs sauvegardées */}
              {Object.keys(savedTestValues).length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✅</span>
                    <span className="text-sm text-green-800">
                      Valeurs sauvegardées disponibles ({Object.keys(savedTestValues).length} champs)
                    </span>
                  </div>
                </div>
              )}

              {/* Boutons de gestion des valeurs de test */}
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={saveTestValues}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  💾 Sauvegarder les valeurs
                </button>
                <button
                  onClick={loadTestValues}
                  disabled={Object.keys(savedTestValues).length === 0}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                    Object.keys(savedTestValues).length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  📂 Charger les valeurs
                </button>
                <button
                  onClick={clearTestValues}
                  disabled={Object.keys(savedTestValues).length === 0}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                    Object.keys(savedTestValues).length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  🗑️ Effacer les valeurs
                </button>
                <button
                  onClick={runTest}
                  disabled={Object.values(parameterMapping).every(v => !v)}
                  className={`px-6 py-2 font-medium rounded-lg transition-colors ${
                    Object.values(parameterMapping).every(v => !v)
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {Object.values(parameterMapping).every(v => !v) 
                    ? 'Configurez d\'abord le mapping' 
                    : '🧪 Tester avec les paramètres mappés'
                  }
                </button>
              </div>
              
              {Object.values(parameterMapping).every(v => !v) && (
                <div className="text-center text-sm text-gray-500">
                  Vous devez mapper au moins un paramètre avant de pouvoir tester la fonction.
                </div>
              )}

              {/* Affichage des erreurs */}
              {testError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-sm text-red-800">
                    <strong>Erreur :</strong> {testError}
                  </div>
                </div>
              )}

              {/* Affichage des résultats */}
              {testResult && (
                <div className="space-y-4">
                  <h5 className="text-lg font-medium text-gray-900">Résultats du test</h5>
                  
                  {/* Résumé principal */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-blue-800">Refus :</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          testResult.refus ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {testResult.refus ? 'OUI' : 'NON'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-800">Prime HT :</span>
                        <span className="ml-2 text-lg font-bold text-blue-900">
                          {testResult.PrimeHT?.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-800">Prime mini HT :</span>
                        <span className="ml-2 text-lg font-bold text-blue-900">
                          {testResult.PminiHT?.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </div>
                    {testResult.refusReason && (
                      <div className="mt-2 text-sm text-red-700">
                        <strong>Raison du refus :</strong> {testResult.refusReason}
                      </div>
                    )}
                  </div>

                  {/* Détail des activités */}
                  {testResult.returnTab && testResult.returnTab.length > 0 && (
                    <div>
                      <h6 className="text-md font-medium text-gray-900 mb-3">Détail par activité</h6>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Activité</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Part CA</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Taux Base</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Prime Mini</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Dégr. Max</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-b">Prime 100</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {testResult.returnTab.map((row: any, index: number) => (
                              <tr key={index}>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.nomActivite}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.partCA}%</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{(row.tauxBase * 100).toFixed(2)}%</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.PrimeMiniAct?.toLocaleString('fr-FR')} €</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.DegMax?.toFixed(3)}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.Prime100Min?.toLocaleString('fr-FR')} €</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Majorations */}
                  {testResult.majorations && (
                    <div>
                      <h6 className="text-md font-medium text-gray-900 mb-3">Majorations appliquées</h6>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(testResult.majorations).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-gray-500 uppercase">{key}</div>
                            <div className="text-sm font-bold text-gray-900">
                              {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value ? 'OUI' : 'NON'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reprise du passé */}
                  {testResult.reprisePasseResult && (
                    <div>
                      <h6 className="text-md font-medium text-gray-900 mb-3">Reprise du passé</h6>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-yellow-800">Pourcentage année reprise :</span>
                            <span className="ml-2 font-bold">{testResult.reprisePasseResult.pourcentageAnneeReprise}%</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-yellow-800">Prime reprise TTC :</span>
                            <span className="ml-2 font-bold">{testResult.reprisePasseResult.primeReprisePasseTTC?.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-yellow-800">Coefficient majoration :</span>
                            <span className="ml-2 font-bold">{testResult.reprisePasseResult.coefficientMajoration}</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-yellow-800">Analyse compagnie requise :</span>
                            <span className="ml-2 font-bold">{testResult.reprisePasseResult.analyseCompagnieRequise ? 'OUI' : 'NON'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Résultats complets en JSON */}
                  <details className="bg-gray-50 border border-gray-200 rounded-md">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100">
                      Voir tous les résultats (JSON)
                    </summary>
                    <pre className="p-4 text-xs text-gray-800 overflow-x-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
