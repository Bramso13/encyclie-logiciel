"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { roleLabel } from "@/lib/ui/labels";
import { Button } from "./Controls";
import { ExerciseYearSelect } from "./ExerciseYearSelect";
import { TerritoryClocks } from "./TerritoryClocks";

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/admin/bordereaux", label: "Bordereaux" },
  { href: "/admin/portefeuille", label: "Portefeuille" },
  { href: "/cabinet", label: "Cabinet" },
];

const SHARED_LINKS = [{ href: "/cabinet", label: "Cabinet" }];

const DEV_TOOLS = [
  { href: "/admin/exercices", label: "Exercices et barèmes" },
  { href: "/admin/import-payments", label: "Import des paiements" },
  { href: "/admin/ecarts-montants", label: "Écarts de montants" },
  { href: "/admin/configuration-produits", label: "Configuration produits" },
  { href: "/modifier_echeancier", label: "Modifier un échéancier" },
];

function isLinkActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BrandLogo({
  href,
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  const mark = (
    <span
      className={`inline-flex items-center rounded-md bg-white px-2.5 py-1 ${className}`}
    >
      <Image
        src="/couleur_1.png"
        alt="Encyclie"
        width={160}
        height={46}
        className="h-8 w-auto"
        priority
      />
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="shrink-0" aria-label="Encyclie">
      {mark}
    </Link>
  );
}

function AdminToolsMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toolActive = DEV_TOOLS.some((tool) => isLinkActive(pathname, tool.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium ${
          toolActive || open
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        Outils
        <span aria-hidden className="text-[10px] opacity-70">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Outils développeur"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-line bg-white py-1 shadow-lg"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Outils développeur
          </p>
          {DEV_TOOLS.map((tool) => {
            const active = isLinkActive(pathname, tool.href);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                role="menuitem"
                className={`block px-3 py-2 text-sm ${
                  active
                    ? "bg-surface font-medium text-ink"
                    : "text-ink hover:bg-surface"
                }`}
              >
                {tool.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({
  userName,
  userRole,
  onSignOut,
  children,
}: {
  userName: string;
  userRole?: string | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = userRole === "ADMIN";

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-6">
            <BrandLogo href="/dashboard" />
            {isAdmin ? (
              <div className="flex min-w-0 items-center gap-1">
                <nav className="hidden items-center gap-1 overflow-x-auto md:flex" aria-label="Navigation administrateur">
                  {ADMIN_LINKS.map((link) => {
                    const active = isLinkActive(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium ${
                          active
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
                <ExerciseYearSelect />
              </div>
            ) : (
              <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation">
                {SHARED_LINKS.map((link) => {
                  const active = isLinkActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isAdmin ? <AdminToolsMenu pathname={pathname} /> : null}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{userName}</p>
              <p className="text-xs text-white/60">{roleLabel(userRole)}</p>
            </div>
            <Button variant="ghost" onClick={onSignOut}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <TerritoryClocks />
      <main className="mx-auto max-w-[1440px] px-4 py-6">{children}</main>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,22rem)_1fr]">
      <aside className="hidden flex-col justify-between bg-ink px-8 py-10 text-white lg:flex">
        <BrandLogo className="px-3 py-1.5" />
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand">
            Assurance construction
          </p>
          <p className="mt-3 text-2xl font-semibold leading-snug">
            Espace courtier et administrateur
          </p>
          <p className="mt-3 text-sm text-white/70">
            Consulter les dossiers, suivre les offres et traiter les paiements
            sans formation.
          </p>
        </div>
      </aside>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex justify-center">
              <BrandLogo className="px-3 py-1.5" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
