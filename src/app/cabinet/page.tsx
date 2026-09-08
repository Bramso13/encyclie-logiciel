"use client";

import { CABINET } from "@/lib/cabinet";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";
import { PageHeader } from "@/components/ui/Feedback";

export default function CabinetPage() {
  const rows = [
    { label: "Adresse", value: CABINET.fullAddress },
    { label: "E-mail", value: CABINET.email, href: `mailto:${CABINET.email}` },
    { label: "Téléphone", value: CABINET.phone, href: `tel:${CABINET.phone.replace(/\s+/g, "")}` },
    { label: "Site", value: CABINET.website, href: CABINET.website },
  ];

  return (
    <AuthenticatedAppShell>
      <PageHeader
        title="Coordonnées du cabinet"
        description="ENCYCLIE CONSTRUCTION — source unique utilisée sur les documents et les e-mails."
      />
      <div className="max-w-lg rounded-lg border border-line bg-white p-6">
        <p className="text-lg font-semibold text-ink">{CABINET.name}</p>
        <dl className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm text-ink">
                {row.href ? (
                  <a
                    href={row.href}
                    className="underline decoration-brand underline-offset-4"
                    target={row.href.startsWith("http") ? "_blank" : undefined}
                    rel={row.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </AuthenticatedAppShell>
  );
}
