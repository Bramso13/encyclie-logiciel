import { 
  WorkflowStep, 
  StepMessage, 
  CreateWorkflowStepData, 
  UpdateWorkflowStepData,
  CreateStepMessageData,
  SubmitStepInputsData,
  StepTemplate
} from "@/lib/types/workflow";

const API_BASE = "/api/workflow";

// Service pour les étapes de workflow
export const workflowApi = {
  // Récupérer les étapes d'un devis
  async getSteps(quoteId: string): Promise<WorkflowStep[]> {
    const response = await fetch(`${API_BASE}/steps?quoteId=${quoteId}`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des étapes: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.steps;
  },

  // Créer une nouvelle étape
  async createStep(stepData: CreateWorkflowStepData): Promise<WorkflowStep> {
    const response = await fetch(`${API_BASE}/steps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stepData),
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la création de l'étape: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.step;
  },

  // Mettre à jour une étape
  async updateStep(stepId: string, stepData: UpdateWorkflowStepData): Promise<WorkflowStep> {
    const response = await fetch(`${API_BASE}/steps/${stepId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stepData),
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la mise à jour de l'étape: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.step;
  },

  // Supprimer une étape
  async deleteStep(stepId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/steps/${stepId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la suppression de l'étape: ${response.statusText}`);
    }
  },

  // Réordonner les étapes
  async reorderSteps(stepIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE}/steps/reorder`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stepIds }),
    });
    if (!response.ok) {
      throw new Error(`Erreur lors du réordonnancement: ${response.statusText}`);
    }
  },

  // Ajouter un message à une étape
  async addMessage(stepId: string, messageData: CreateStepMessageData): Promise<StepMessage> {
    const formData = new FormData();
    formData.append("content", messageData.content);
    formData.append("type", messageData.type);
    
    if (messageData.attachments) {
      messageData.attachments.forEach(file => {
        formData.append("attachments", file);
      });
    }

    const response = await fetch(`${API_BASE}/steps/${stepId}/messages`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de l'ajout du message: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.message;
  },

  // Soumettre les inputs d'une étape
  async submitStepInputs(stepId: string, inputsData: SubmitStepInputsData): Promise<WorkflowStep> {
    const response = await fetch(`${API_BASE}/steps/${stepId}/inputs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputsData),
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la soumission des inputs: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.step;
  },

  // Récupérer les templates
  async getTemplates(): Promise<StepTemplate[]> {
    const response = await fetch(`${API_BASE}/templates`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des templates: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.templates;
  },

  // Créer un template
  async createTemplate(templateData: {
    name: string;
    description?: string;
    title: string;
    defaultInputs: any[];
  }): Promise<StepTemplate> {
    const response = await fetch(`${API_BASE}/templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templateData),
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la création du template: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.template;
  }
};
