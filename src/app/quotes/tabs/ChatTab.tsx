"use client";

import { Quote } from "@/lib/types";
import { useSession } from "@/lib/auth-client";
import useQuoteChatStore from "@/lib/stores/quote-chat-store";
import { useEffect, useState, useRef } from "react";

export default function ChatTab({ quote }: { quote: Quote }) {
  const { data: session } = useSession();
  const {
    messages,
    loading,
    error,
    unreadCount,
    fetchMessages,
    sendMessage,
    markMessageAsRead,
    setCurrentReceiverId,
  } = useQuoteChatStore();

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Déterminer qui est l'autre participant du chat
  const otherParticipant = session?.user?.role === "ADMIN"
    ? { id: quote.broker?.id, role: "BROKER", name: quote.broker?.name }
    : { id: "admin", role: "ADMIN", name: "Administrateur" }; // Ici il faudra récupérer l'admin assigné

  useEffect(() => {
    if (quote.id && session?.user) {
      fetchMessages(quote.id);
      if (otherParticipant?.id) {
        setCurrentReceiverId(otherParticipant.id);
      }
    }
  }, [quote.id, session?.user, fetchMessages, setCurrentReceiverId, otherParticipant?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("newMessage", newMessage);
    console.log("session", session);
    console.log("otherParticipant", otherParticipant);

    if (!newMessage.trim() || !session?.user || !otherParticipant?.id) return;

    setSending(true);
    try {
      await sendMessage({
        content: newMessage.trim(),
        quoteId: quote.id,
        receiverId: otherParticipant.id,
      });
      setNewMessage("");
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (session?.user) {
      await markMessageAsRead(messageId);
    }
  };

  if (!session?.user) {
    return (
      <div className="p-4 text-center text-gray-500">
        Vous devez être connecté pour utiliser le chat.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-lg">
          Chat - Devis {quote.reference}
        </h3>
        <p className="text-sm text-gray-600">
          Conversation avec {otherParticipant?.name} ({otherParticipant?.role === "ADMIN" ? "Administrateur" : "Courtier"})
        </p>
        {unreadCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {unreadCount} message{unreadCount > 1 ? "s" : ""} non lu{unreadCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-500">Chargement des messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
            Aucun message pour le moment. Commencez la conversation !
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === session.user.id;
            const isUnread = !message.isRead && !isOwnMessage;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                onClick={() => isUnread && handleMarkAsRead(message.id)}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? "bg-blue-500 text-white"
                      : `bg-gray-100 text-gray-900 ${isUnread ? "ring-2 ring-blue-300" : ""}`
                  }`}
                >
                  <div className="text-sm">
                    <div className="font-medium mb-1">
                      {isOwnMessage ? "Vous" : message.sender.name}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={`text-xs mt-2 ${
                        isOwnMessage ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isUnread && !isOwnMessage && (
                        <span className="ml-2 text-blue-600 font-medium">Non lu</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "..." : "Envoyer"}
          </button>
        </div>
      </form>
    </div>
  );
}