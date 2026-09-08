"use client";

import { useState } from "react";
import useMessagesStore from "@/lib/stores/messages-store";
import { Button } from "@/components/ui/Controls";
import { DataTable } from "@/components/ui/DataDisplay";
import { EmptyState, LoadingState } from "@/components/ui/Feedback";
import { formatDateFr } from "@/lib/ui/labels";
import MessageComposer from "@/components/messages/MessageComposer";

export function AdminMessagesPanel() {
  const {
    receivedMessages,
    loading,
    markMessageAsRead,
    deleteMessage,
    fetchReceivedMessages,
    fetchUnreadCount,
  } = useMessagesStore();
  const [compose, setCompose] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const opened = receivedMessages.find((message) => message.id === openId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCompose(true)}>Rédiger un message</Button>
      </div>
      <DataTable>
        {loading && receivedMessages.length === 0 ? (
          <LoadingState active label="Chargement des messages" />
        ) : receivedMessages.length === 0 ? (
          <EmptyState
            title="Aucun message"
            description="Les messages reçus des courtiers apparaîtront ici."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Expéditeur</th>
                <th>Sujet</th>
                <th>Aperçu</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receivedMessages.map((message) => (
                <tr key={message.id} className={!message.isRead ? "font-semibold" : ""}>
                  <td>{message.user?.name || "Courtier"}</td>
                  <td>
                    {message.title}
                    {message.isUrgent ? (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">
                        Urgent
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-xs truncate text-ink-muted">
                    {message.message}
                  </td>
                  <td>{formatDateFr(message.createdAt)}</td>
                  <td>{message.isRead ? "Lu" : "Non lu"}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-sm font-semibold underline decoration-brand underline-offset-4"
                        onClick={() => {
                          setOpenId(message.id);
                          if (!message.isRead) markMessageAsRead(message.id);
                        }}
                      >
                        Lire
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-rose-700"
                        onClick={() => deleteMessage(message.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>

      {opened ? (
        <div className="rounded-lg border border-line bg-white p-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-ink">{opened.title}</h3>
              <p className="text-ink-muted">
                {formatDateFr(opened.createdAt)}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setOpenId(null)}>
              Fermer
            </Button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-ink">{opened.message}</p>
        </div>
      ) : null}

      {compose ? (
        <MessageComposer
          onClose={() => setCompose(false)}
          onSuccess={() => {
            fetchReceivedMessages();
            fetchUnreadCount();
          }}
        />
      ) : null}
    </div>
  );
}
