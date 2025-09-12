"use client";

import { useState, useRef, useEffect } from "react";
import { WorkflowStep, StepMessage, MessageType, CreateStepMessageData } from "@/lib/types/workflow";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { authClient } from "@/lib/auth-client";

interface StepMessagingPanelProps {
  step: WorkflowStep;
  onClose: () => void;
}

export default function StepMessagingPanel({ step, onClose }: StepMessagingPanelProps) {
  const { addMessage, markMessageAsRead } = useWorkflowStore();
  const { data: session } = authClient.useSession();
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>(MessageType.ADMIN_INSTRUCTION);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [step.messages]);

  useEffect(() => {
    // Marquer les messages non lus comme lus
    step.messages
      .filter(msg => !msg.isRead && msg.authorId !== session?.user?.id)
      .forEach(msg => markMessageAsRead(msg.id));
  }, [step.messages, session?.user?.id, markMessageAsRead]);

  const getMessageTypeLabel = (type: MessageType) => {
    switch (type) {
      case MessageType.ADMIN_INSTRUCTION:
        return "Instruction";
      case MessageType.BROKER_QUESTION:
        return "Question";
      case MessageType.BROKER_RESPONSE:
        return "Réponse";
      case MessageType.SYSTEM_NOTIFICATION:
        return "Notification";
      default:
        return "Message";
    }
  };

  const getMessageTypeColor = (type: MessageType) => {
    switch (type) {
      case MessageType.ADMIN_INSTRUCTION:
        return "bg-blue-100 text-blue-800";
      case MessageType.BROKER_QUESTION:
        return "bg-yellow-100 text-yellow-800";
      case MessageType.BROKER_RESPONSE:
        return "bg-green-100 text-green-800";
      case MessageType.SYSTEM_NOTIFICATION:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      const messageData: CreateStepMessageData = {
        content: newMessage.trim(),
        type: messageType,
        attachments: attachments.length > 0 ? attachments : undefined
      };

      await addMessage(step.id, messageData);
      setNewMessage("");
      setAttachments([]);
      setMessageType(MessageType.ADMIN_INSTRUCTION);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "À l'instant";
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 48) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Messages - {step.title}
            </h2>
            <p className="text-sm text-gray-500">
              {step.messages.length} message{step.messages.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step.messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p>Aucun message pour cette étape</p>
              <p className="text-sm">Commencez la conversation ci-dessous</p>
            </div>
          ) : (
            step.messages
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.authorId === session?.user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.authorId === session?.user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        message.authorId === session?.user?.id
                          ? 'bg-blue-500 text-white'
                          : getMessageTypeColor(message.type)
                      }`}>
                        {getMessageTypeLabel(message.type)}
                      </span>
                      {!message.isRead && message.authorId !== session?.user?.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <p className="text-sm">{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center space-x-2 text-xs">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span>{attachment.fileName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs mt-1 opacity-75">
                      {formatDate(message.createdAt)}
                    </div>
                  </div>
                </div>
              ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="border-t border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Message Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de message
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as MessageType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={MessageType.ADMIN_INSTRUCTION}>Instruction</option>
                <option value={MessageType.BROKER_QUESTION}>Question</option>
                <option value={MessageType.BROKER_RESPONSE}>Réponse</option>
                <option value={MessageType.SYSTEM_NOTIFICATION}>Notification</option>
              </select>
            </div>

            {/* Message Input */}
            <div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Tapez votre message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* File Attachments */}
            {attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pièces jointes
                </label>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ajouter des fichiers
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || (!newMessage.trim() && attachments.length === 0)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
