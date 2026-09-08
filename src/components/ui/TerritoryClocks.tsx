"use client";

import { useEffect, useState } from "react";

const ZONES = [
  { id: "Europe/Paris", label: "Métropole" },
  { id: "America/Martinique", label: "Martinique" },
  { id: "America/Guadeloupe", label: "Guadeloupe" },
  { id: "America/Cayenne", label: "Guyane" },
  { id: "Indian/Reunion", label: "Réunion" },
  { id: "Indian/Mayotte", label: "Mayotte" },
] as const;

function formatTime(zone: string, now: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

export function TerritoryClocks() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 overflow-x-auto px-4 py-1.5">
        {ZONES.map((zone) => (
          <div
            key={zone.id}
            className="flex shrink-0 items-baseline gap-1.5 text-xs text-ink"
          >
            <span className="text-ink-muted">{zone.label}</span>
            <span className="font-medium tabular-nums">
              {formatTime(zone.id, now)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
