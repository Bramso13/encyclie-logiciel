"use client";

export function DataTable({
  children,
  toolbar,
  footer,
  compact = false,
}: {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3">
          {toolbar}
        </div>
      ) : null}
      <div className={`ds-table-wrap${compact ? " ds-table-wrap--compact" : ""}`}>
        {children}
      </div>
      {footer ? (
        <div className="border-t border-line bg-white px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  itemLabel = "résultat",
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  itemLabel?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const plural = total > 1 ? "s" : "";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-muted">
        {total === 0
          ? `Aucun ${itemLabel}`
          : `${from}–${to} sur ${total} ${itemLabel}${plural}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onLimitChange ? (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            Afficher
            <select
              className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Nombre de lignes par page"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Page précédente
        </button>
        <span className="text-sm tabular-nums text-ink-muted">
          {Math.max(page, 1)} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || totalPages === 0}
        >
          Page suivante
        </button>
      </div>
    </div>
  );
}

export function GroupedNav({
  groups,
  value,
  onChange,
  label = "Sections",
}: {
  groups: Array<{
    title: string;
    items: Array<{ id: string; label: string }>;
  }>;
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="rounded-lg border border-line bg-white p-2 lg:sticky lg:top-20"
    >
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1 lg:flex-col lg:flex-nowrap">
              {group.items.map((item) => {
                const active = item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onChange(item.id)}
                    className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-brand font-semibold text-ink"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function ScrollTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; badge?: number }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-line">
      <nav
        className="flex gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:thin]"
        aria-label="Sections"
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {tab.label}
                {tab.badge ? (
                  <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                    {tab.badge}
                  </span>
                ) : null}
              </span>
              {active ? (
                <span className="absolute inset-x-2 bottom-0 h-0.5 bg-brand" />
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
