// Types pour le système de workflow

export enum StepStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

export enum MessageType {
  ADMIN_INSTRUCTION = 'ADMIN_INSTRUCTION',
  BROKER_QUESTION = 'BROKER_QUESTION',
  BROKER_RESPONSE = 'BROKER_RESPONSE',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION'
}

export enum InputType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  DATE = 'DATE',
  FILE = 'FILE',
  CHECKBOX = 'CHECKBOX'
}

// Interface pour les inputs dynamiques des étapes
export interface StepInput {
  id: string;
  stepId: string;
  type: InputType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // Pour les inputs de type SELECT
  validationRules?: Record<string, any>;
  value?: any;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface pour les pièces jointes des messages
export interface StepMessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

// Interface pour les messages dans les étapes
export interface StepMessage {
  id: string;
  stepId: string;
  content: string;
  type: MessageType;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  isRead: boolean;
  readAt?: string;
  attachments: StepMessageAttachment[];
  createdAt: string;
  updatedAt: string;
}

// Interface pour les templates d'étapes
export interface StepTemplate {
  id: string;
  name: string;
  description?: string;
  title: string;
  defaultInputs: Partial<StepInput>[];
  isActive: boolean;
  usageCount: number;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Interface principale pour les étapes de workflow
export interface WorkflowStep {
  id: string;
  quoteId: string;
  title: string;
  description?: string;
  order: number;
  status: StepStatus;
  assignedToBrokerId?: string;
  assignedToBroker?: {
    id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  isTemplate: boolean;
  templateId?: string;
  template?: StepTemplate;
  inputs: StepInput[];
  messages: StepMessage[];
  createdAt: string;
  updatedAt: string;
}

// Interface pour créer une nouvelle étape
export interface CreateWorkflowStepData {
  quoteId: string;
  title: string;
  description?: string;
  order: number;
  assignedToBrokerId?: string;
  dueDate?: string;
  templateId?: string;
  inputs?: Partial<StepInput>[];
}

// Interface pour mettre à jour une étape
export interface UpdateWorkflowStepData {
  title?: string;
  description?: string;
  order?: number;
  status?: StepStatus;
  assignedToBrokerId?: string;
  dueDate?: string;
}

// Interface pour créer un message
export interface CreateStepMessageData {
  content: string;
  type: MessageType;
  attachments?: File[];
}

// Interface pour soumettre des inputs d'étape
export interface SubmitStepInputsData {
  inputs: Record<string, any>;
}

// Interface pour les templates prédéfinis
export const STEP_TEMPLATES = {
  DOCUMENT_VERIFICATION: {
    title: "Vérification documents",
    description: "Vérifier et valider tous les documents requis",
    defaultInputs: [
      { 
        type: InputType.CHECKBOX, 
        label: 'Documents reçus', 
        required: true 
      },
      { 
        type: InputType.TEXTAREA, 
        label: 'Notes de vérification', 
        required: false 
      }
    ]
  },
  RISK_ANALYSIS: {
    title: "Analyse des risques",
    description: "Évaluer le profil de risque du client",
    defaultInputs: [
      { 
        type: InputType.SELECT, 
        label: 'Niveau de risque', 
        options: ['Faible', 'Moyen', 'Élevé'], 
        required: true 
      },
      { 
        type: InputType.TEXTAREA, 
        label: 'Justification', 
        required: true 
      }
    ]
  },
  COMMERCIAL_VALIDATION: {
    title: "Validation commerciale",
    description: "Validation finale des conditions commerciales",
    defaultInputs: [
      { 
        type: InputType.CHECKBOX, 
        label: 'Conditions acceptées', 
        required: true 
      },
      { 
        type: InputType.TEXT, 
        label: 'Commentaires', 
        required: false 
      }
    ]
  }
} as const;

// Types utilitaires
export type StepTemplateKey = keyof typeof STEP_TEMPLATES;

// Interface pour l'état du workflow
export interface WorkflowState {
  steps: WorkflowStep[];
  activeStep?: WorkflowStep;
  isLoading: boolean;
  error?: string;
}

// Interface pour les actions du workflow
export interface WorkflowActions {
  createStep: (data: CreateWorkflowStepData) => Promise<void>;
  updateStep: (stepId: string, data: UpdateWorkflowStepData) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  reorderSteps: (stepIds: string[]) => Promise<void>;
  addMessage: (stepId: string, data: CreateStepMessageData) => Promise<void>;
  submitStepInputs: (stepId: string, data: SubmitStepInputsData) => Promise<void>;
  markStepAsCompleted: (stepId: string) => Promise<void>;
  markStepAsActive: (stepId: string) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
}
