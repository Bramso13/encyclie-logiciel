"use client";

import { Quote } from "@/lib/types";
import { useSession } from "@/lib/auth-client";
import useQuoteChatStore from "@/lib/stores/quote-chat-store";
import { useEffect, useState, useRef } from "react";
import { Button, inputClassName } from "@/components/ui/Controls";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/ui/Feedback";

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
  const otherParticipant =
    session?.user?.role === "ADMIN"
      ? { id: quote.broker?.id, role: "BROKER", name: quote.broker?.name }
      : { id: "admin", role: "ADMIN", name: "Administrateur" }; // Ici il faudra récupérer l'admin assigné

  useEffect(() => {
    if (quote.id && session?.user) {
      fetchMessages(quote.id);
      if (otherParticipant?.id) {
        setCurrentReceiverId(otherParticipant.id);
      }
    }
  }, [
    quote.id,
    session?.user,
    fetchMessages,
    setCurrentReceiverId,
    otherParticipant?.id,
  ]);

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
      <EmptyState
        title="Connexion requise"
        description="Connectez-vous pour échanger sur ce dossier."
      />
    );
  }

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h3 className="font-semibold text-ink">Messages du dossier {quote.reference}</h3>
        <p className="text-sm text-ink-muted">
          Conversation avec {otherParticipant?.name} (
          {otherParticipant?.role === "ADMIN" ? "Administrateur" : "Courtier"})
        </p>
        {unreadCount > 0 ? (
          <span className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
            {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && messages.length === 0 ? (
          <LoadingState active label="Chargement des messages" />
        ) : messages.length === 0 ? (
          <EmptyState
            title="Aucun message"
            description="Écrivez le premier message pour démarrer l'échange."
          />
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === session.user.id;
            const isUnread = !message.isRead && !isOwnMessage;

            return (
              <div
                key={message.id}
                className={`flex ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
                onClick={() => isUnread && handleMarkAsRead(message.id)}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
                    isOwnMessage
                      ? "bg-ink text-white"
                      : `border border-line bg-surface text-ink ${
                          isUnread ? "ring-2 ring-brand/40" : ""
                        }`
                  }`}
                >
                  <div className="text-sm">
                    <div className="mb-1 font-medium">
                      {isOwnMessage
                        ? "Vous"
                        : message.sender && message.sender.role === "ADMIN"
                          ? "Administrateur"
                          : message.sender && message.sender.name}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={`mt-2 text-xs ${
                        isOwnMessage ? "text-white/70" : "text-ink-muted"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isUnread && !isOwnMessage ? (
                        <span className="ml-2 font-medium text-brand">Non lu</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error ? (
        <div className="px-4 py-2">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      ) : null}

      <form onSubmit={handleSendMessage} className="border-t border-line p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrire un message"
            className={inputClassName}
            disabled={sending}
            aria-label="Nouveau message"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
