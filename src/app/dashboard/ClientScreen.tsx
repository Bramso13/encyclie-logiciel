"use client";

import { useState } from "react";

interface Project {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  brokerName: string;
  brokerEmail: string;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderRole: string;
  createdAt: string;
  isFromClient: boolean;
}

interface ClientScreenProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function ClientScreen({ user }: ClientScreenProps) {
  const [activeTab, setActiveTab] = useState("projects");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Mock data - à remplacer par de vraies données
  const projects: Project[] = [
    {
      id: "1",
      title: "Assurance habitation - Maison principale",
      description: "Assurance pour ma résidence principale de 120m²",
      type: "NEW_CONSTRUCTION",
      status: "ACTIVE",
      budget: 1200,
      startDate: "2024-02-01",
      endDate: "2025-02-01",
      brokerName: "Jean Dupont",
      brokerEmail: "jean.dupont@example.com",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      title: "Assurance travaux - Rénovation cuisine",
      description: "Couverture pour les travaux de rénovation de la cuisine",
      type: "RENOVATION",
      status: "UNDER_REVIEW",
      budget: 850,
      brokerName: "Jean Dupont",
      brokerEmail: "jean.dupont@example.com",
      createdAt: "2024-01-20",
    },
  ];

  const messages: Message[] = [
    {
      id: "1",
      content: "Bonjour, j'ai reçu votre dossier pour l'assurance travaux. J'aurai besoin de quelques documents complémentaires.",
      senderName: "Jean Dupont",
      senderRole: "Courtier",
      createdAt: "2024-01-22T10:30:00",
      isFromClient: false,
    },
    {
      id: "2",
      content: "Bonjour, quels sont les documents dont vous avez besoin ?",
      senderName: user.name,
      senderRole: "Client",
      createdAt: "2024-01-22T14:15:00",
      isFromClient: true,
    },
    {
      id: "3",
      content: "Il me faudrait les plans de la cuisine et un devis détaillé des travaux.",
      senderName: "Jean Dupont",
      senderRole: "Courtier",
      createdAt: "2024-01-22T16:45:00",
      isFromClient: false,
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: "bg-gray-100 text-gray-800", text: "Brouillon" },
      SUBMITTED: { color: "bg-blue-100 text-blue-800", text: "Soumis" },
      UNDER_REVIEW: { color: "bg-yellow-100 text-yellow-800", text: "En cours d'étude" },
      APPROVED: { color: "bg-green-100 text-green-800", text: "Approuvé" },
      REJECTED: { color: "bg-red-100 text-red-800", text: "Rejeté" },
      ACTIVE: { color: "bg-indigo-100 text-indigo-800", text: "Actif" },
      COMPLETED: { color: "bg-purple-100 text-purple-800", text: "Terminé" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getProjectType = (type: string) => {
    const typeConfig = {
      NEW_CONSTRUCTION: "Assurance habitation",
      RENOVATION: "Assurance travaux",
      EXTENSION: "Extension/Agrandissement",
      MULTI_RISK: "Multi-risques",
    };
    return typeConfig[type as keyof typeof typeConfig] || type;
  };

  const activeProjects = projects.filter(p => p.status === "ACTIVE").length;
  const pendingProjects = projects.filter(p => p.status === "UNDER_REVIEW").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Mon Espace Client
        </h1>
        <p className="text-gray-600 mt-2">
          Bienvenue {user.name}, suivez vos projets d'assurance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Assurances Actives
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {activeProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    En Cours d'Étude
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pendingProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Messages Non Lus
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    2
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("projects")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "projects"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Mes Projets ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "messages"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Messages ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "documents"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Documents
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "projects" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Mes Projets d'Assurance
                </h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  Nouvelle demande
                </button>
              </div>

              <div className="grid gap-6">
                {projects.map((project) => (
                  <div key={project.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            {project.title}
                          </h4>
                          {getStatusBadge(project.status)}
                        </div>
                        <p className="text-gray-600 mt-2">
                          {project.description}
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">Type:</span>
                            <span className="ml-2 text-gray-900">{getProjectType(project.type)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Budget:</span>
                            <span className="ml-2 text-gray-900">
                              {project.budget ? `${project.budget} €/an` : 'Non défini'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Courtier:</span>
                            <span className="ml-2 text-gray-900">{project.brokerName}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Créé le:</span>
                            <span className="ml-2 text-gray-900">
                              {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          Voir détails
                        </button>
                        {project.status === "ACTIVE" && (
                          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                            Gérer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Conversation avec votre courtier
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isFromClient ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isFromClient
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <div className="text-sm">
                          <div className={`font-medium ${message.isFromClient ? 'text-indigo-100' : 'text-gray-600'}`}>
                            {message.senderName} ({message.senderRole})
                          </div>
                          <div className="mt-1">{message.content}</div>
                          <div className={`text-xs mt-2 ${message.isFromClient ? 'text-indigo-200' : 'text-gray-500'}`}>
                            {new Date(message.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Tapez votre message..."
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  Envoyer
                </button>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Mes Documents
                </h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  Téléverser un document
                </button>
              </div>

              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun document</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Commencez par téléverser vos premiers documents.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}