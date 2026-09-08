import { quoteStatusLabel, quoteStatusTone } from "@/lib/ui/labels";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-ink hover:bg-brand-hover focus-visible:outline-brand disabled:opacity-50",
  secondary:
    "border border-line bg-white text-ink hover:bg-surface focus-visible:outline-brand disabled:opacity-50",
  danger:
    "bg-rose-700 text-white hover:bg-rose-800 focus-visible:outline-rose-700 disabled:opacity-50",
  ghost:
    "text-ink-muted hover:bg-white/10 hover:text-white focus-visible:outline-white disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${quoteStatusTone(status)}`}
    >
      {quoteStatusLabel(status)}
    </span>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClassName =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
