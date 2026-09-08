"use client";

import { useState } from "react";
import useMessagesStore from "@/lib/stores/messages-store";
import useUsersStore from "@/lib/stores/users-store";
import { notify } from "@/lib/ui/notify";
import { Modal } from "@/components/ui/Modal";
import { Button, FormField, inputClassName } from "@/components/ui/Controls";

interface MessageComposerProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MessageComposer({
  onClose,
  onSuccess,
}: MessageComposerProps) {
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
      notify("Message envoyé.", "success");
      onSuccess?.();
      onClose();
    } else {
      notify("L'envoi du message a échoué.", "error");
    }
  };

  return (
    <Modal
      open
      title="Nouveau message"
      onClose={loading ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="message-composer-form"
            disabled={
              loading || !title.trim() || !message.trim() || !recipientId
            }
          >
            {loading ? "Envoi…" : "Envoyer"}
          </Button>
        </>
      }
    >
      <form
        id="message-composer-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <FormField id="recipient" label="Destinataire">
          <select
            id="recipient"
            className={inputClassName}
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            required
          >
            <option value="">Sélectionner un destinataire</option>
            {allUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} (
                {user.role === "BROKER" ? "Courtier" : "Souscripteur"})
                {user.companyName ? ` — ${user.companyName}` : ""}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="message-title" label="Sujet">
          <input
            id="message-title"
            className={inputClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </FormField>
        <FormField id="message-body" label="Message">
          <textarea
            id="message-body"
            className={inputClassName}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            id="urgent"
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
          />
          Message urgent
        </label>
      </form>
    </Modal>
  );
}
