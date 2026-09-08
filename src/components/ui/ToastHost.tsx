"use client";

import { useEffect, useState } from "react";
import {
  TOAST_EVENT,
  type ToastDetail,
  type ToastTone,
} from "@/lib/ui/notify";

type ToastItem = ToastDetail & { id: number; type: ToastTone };

const TONE_CLASS: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-line bg-white text-ink",
};

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      const item: ToastItem = {
        id: Date.now() + Math.random(),
        message: detail.message,
        title: detail.title,
        type: detail.type ?? "info",
      };
      setToasts((current) => [...current.slice(-4), item]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== item.id));
      }, 5000);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${TONE_CLASS[toast.type]}`}
          role="status"
        >
          {toast.title ? (
            <p className="font-semibold">{toast.title}</p>
          ) : null}
          <p>{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
