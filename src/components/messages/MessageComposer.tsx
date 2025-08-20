"use client";

import { useState } from "react";
import useMessagesStore from "@/lib/stores/messages-store";
import useUsersStore from "@/lib/stores/users-store";

interface MessageComposerProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MessageComposer({ onClose, onSuccess }: MessageComposerProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const { sendMessage, loading } = useMessagesStore();
  const { brokers, underwriters } = useUsersStore();

  const allUsers = [...brokers, ...underwriters];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim() || !recipientId) return;

    const result = await sendMessage({
      title: title.trim(),
      message: message.trim(),
      userId: recipientId,
      isUrgent,
    });

    if (result) {
      setTitle("");
      setMessage("");
      setRecipientId("");
      setIsUrgent(false);
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Nouveau message
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Destinataire */}
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                Destinataire
              </label>
              <select
                id="recipient"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Sélectionner un destinataire</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === "BROKER" ? "Courtier" : "Souscripteur"}) - {user.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Sujet */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Sujet
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Sujet du message"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Contenu de votre message..."
                required
              />
            </div>

            {/* Options */}
            <div className="flex items-center">
              <input
                id="urgent"
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="urgent" className="ml-2 block text-sm text-gray-900">
                Message urgent
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !message.trim() || !recipientId}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Envoi...
                  </>
                ) : (
                  "Envoyer"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}