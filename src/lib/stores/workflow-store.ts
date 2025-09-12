import { create } from 'zustand';
import { 
  WorkflowStep, 
  StepMessage, 
  CreateWorkflowStepData, 
  UpdateWorkflowStepData,
  CreateStepMessageData,
  SubmitStepInputsData,
  StepStatus,
  WorkflowState,
  WorkflowActions
} from '@/lib/types/workflow';
import { workflowApi } from '@/lib/api/workflow';

interface WorkflowStore extends WorkflowState, WorkflowActions {
  // Actions de base
  setSteps: (steps: WorkflowStep[]) => void;
  setActiveStep: (step: WorkflowStep | undefined) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  
  // Actions de gestion des étapes
  addStep: (step: WorkflowStep) => void;
  updateStepInStore: (stepId: string, updates: Partial<WorkflowStep>) => void;
  removeStep: (stepId: string) => void;
  
  // Actions de gestion des messages
  addMessageToStep: (stepId: string, message: StepMessage) => void;
  markMessageAsRead: (messageId: string) => void;
  
  // Actions de gestion des inputs
  updateStepInputs: (stepId: string, inputs: any) => void;
  
  // Utilitaires
  getStepById: (stepId: string) => WorkflowStep | undefined;
  getStepsByStatus: (status: StepStatus) => WorkflowStep[];
  getNextStep: () => WorkflowStep | undefined;
  getPreviousStep: () => WorkflowStep | undefined;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // État initial
  steps: [],
  activeStep: undefined,
  isLoading: false,
  error: undefined,

  // Actions de base
  setSteps: (steps) => set({ steps }),
  setActiveStep: (activeStep) => set({ activeStep }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Actions de gestion des étapes
  addStep: (step) => set((state) => ({ 
    steps: [...state.steps, step].sort((a, b) => a.order - b.order) 
  })),
  
  updateStepInStore: (stepId, updates) => set((state) => ({
    steps: state.steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ),
    activeStep: state.activeStep?.id === stepId 
      ? { ...state.activeStep, ...updates } 
      : state.activeStep
  })),
  
  removeStep: (stepId) => set((state) => ({
    steps: state.steps.filter(step => step.id !== stepId),
    activeStep: state.activeStep?.id === stepId ? undefined : state.activeStep
  })),

  // Actions de gestion des messages
  addMessageToStep: (stepId, message) => set((state) => ({
    steps: state.steps.map(step => 
      step.id === stepId 
        ? { ...step, messages: [...step.messages, message] }
        : step
    ),
    activeStep: state.activeStep?.id === stepId 
      ? { ...state.activeStep, messages: [...state.activeStep.messages, message] }
      : state.activeStep
  })),
  
  markMessageAsRead: (messageId) => set((state) => ({
    steps: state.steps.map(step => ({
      ...step,
      messages: step.messages.map(message => 
        message.id === messageId 
          ? { ...message, isRead: true, readAt: new Date().toISOString() }
          : message
      )
    })),
    activeStep: state.activeStep ? {
      ...state.activeStep,
      messages: state.activeStep.messages.map(message => 
        message.id === messageId 
          ? { ...message, isRead: true, readAt: new Date().toISOString() }
          : message
      )
    } : undefined
  })),

  // Actions de gestion des inputs
  updateStepInputs: (stepId, inputs) => set((state) => ({
    steps: state.steps.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            inputs: step.inputs.map(input => ({
              ...input,
              value: inputs[input.id] || input.value,
              submittedAt: inputs[input.id] ? new Date().toISOString() : input.submittedAt
            }))
          }
        : step
    ),
    activeStep: state.activeStep?.id === stepId 
      ? { 
          ...state.activeStep, 
          inputs: state.activeStep.inputs.map(input => ({
            ...input,
            value: inputs[input.id] || input.value,
            submittedAt: inputs[input.id] ? new Date().toISOString() : input.submittedAt
          }))
        }
      : state.activeStep
  })),

  // Utilitaires
  getStepById: (stepId) => {
    const { steps } = get();
    return steps.find(step => step.id === stepId);
  },
  
  getStepsByStatus: (status) => {
    const { steps } = get();
    return steps.filter(step => step.status === status);
  },
  
  getNextStep: () => {
    const { steps, activeStep } = get();
    if (!activeStep) return steps.find(step => step.status === StepStatus.PENDING);
    return steps.find(step => step.order > activeStep.order && step.status === StepStatus.PENDING);
  },
  
  getPreviousStep: () => {
    const { steps, activeStep } = get();
    if (!activeStep) return undefined;
    return steps
      .filter(step => step.order < activeStep.order)
      .sort((a, b) => b.order - a.order)[0];
  },

  // Actions API
  createStep: async (data: CreateWorkflowStepData) => {
    set({ isLoading: true, error: undefined });
    try {
      const newStep = await workflowApi.createStep(data);
      get().addStep(newStep);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erreur lors de la création de l\'étape' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateStep: async (stepId: string, data: UpdateWorkflowStepData) => {
    set({ isLoading: true, error: undefined });
    try {
      const updatedStep = await workflowApi.updateStep(stepId, data);
      get().updateStepInStore(stepId, updatedStep);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'étape' });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteStep: async (stepId: string) => {
    set({ isLoading: true, error: undefined });
    try {
      await workflowApi.deleteStep(stepId);
      get().removeStep(stepId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'étape' });
    } finally {
      set({ isLoading: false });
    }
  },

  reorderSteps: async (stepIds: string[]) => {
    set({ isLoading: true, error: undefined });
    try {
      await workflowApi.reorderSteps(stepIds);
      // Recharger les étapes depuis l'API
      const currentSteps = get().steps;
      if (currentSteps.length > 0) {
        const quoteId = currentSteps[0].quoteId;
        const updatedSteps = await workflowApi.getSteps(quoteId);
        get().setSteps(updatedSteps);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erreur lors du réordonnancement des étapes' });
    } finally {
      set({ isLoading: false });
    }
  },

  addMessage: async (stepId: string, data: CreateStepMessageData) => {
    set({ isLoading: true, error: undefined });
    try {
      const newMessage = await workflowApi.addMessage(stepId, data);
      get().addMessageToStep(stepId, newMessage);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erreur lors de l\'ajout du message' });
    } finally {
      set({ isLoading: false });
    }
  },

  submitStepInputs: async (stepId: string, data: SubmitStepInputsData) => {
    set({ isLoading: true, error: undefined });
    try {
      const updatedStep = await workflowApi.submitStepInputs(stepId, data);
      get().updateStepInStore(stepId, updatedStep);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erreur lors de la soumission des inputs' });
    } finally {
      set({ isLoading: false });
    }
  },

  markStepAsCompleted: async (stepId: string) => {
    await get().updateStep(stepId, { status: StepStatus.COMPLETED });
  },

  markStepAsActive: async (stepId: string) => {
    await get().updateStep(stepId, { status: StepStatus.ACTIVE });
  },

  skipStep: async (stepId: string) => {
    await get().updateStep(stepId, { status: StepStatus.SKIPPED });
  }
}));
