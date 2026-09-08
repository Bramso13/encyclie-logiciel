"use client";

import { useEffect } from "react";
import { Button } from "./Controls";

const MODAL_WIDTH = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: keyof typeof MODAL_WIDTH;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-modal-title"
        className={`relative z-10 flex max-h-[90vh] w-full ${MODAL_WIDTH[size]} flex-col overflow-hidden rounded-lg border border-line bg-white p-6 shadow-xl`}
      >
        <h2 id="ds-modal-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto text-sm text-ink">
          {children}
        </div>
        {footer ? (
          <div className="mt-5 flex w-full shrink-0 items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  danger = false,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Traitement…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-ink-muted">{message}</p>
      {error ? <p className="mt-3 text-rose-700">{error}</p> : null}
    </Modal>
  );
}
