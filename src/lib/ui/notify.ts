export type ToastTone = "success" | "error" | "info";

export type ToastDetail = {
  message: string;
  type?: ToastTone;
  title?: string;
};

export const TOAST_EVENT = "encyclie:toast";

export function notify(
  message: string,
  type: ToastTone = "info",
  title?: string,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, {
      detail: { message, type, title },
    }),
  );
}
