"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV, NAV_GROUPS } from "@/lib/core/nav";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/core/cn";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-sp-5 overflow-y-auto px-sp-3 py-sp-4">
      {NAV_GROUPS.map((group) => (
        <div key={group}>
          <p className="px-sp-3 pb-sp-2 text-xs font-semibold uppercase tracking-wide text-ink-disabled">{group}</p>
          <ul className="space-y-px">
            {NAV.filter((n) => n.group === group).map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              if (item.soon) {
                return (
                  <li key={item.label}>
                    <div
                      className="flex cursor-not-allowed items-center gap-sp-3 rounded-md px-sp-3 py-sp-2 text-sm text-ink-disabled"
                      title={`${item.label} — bientôt disponible`}
                      aria-disabled="true"
                    >
                      <Icon size={18} className="shrink-0 opacity-60" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="shrink-0 rounded-pill bg-fill-muted px-sp-2 py-px text-[10px] font-medium text-ink-faint">
                        Bientôt
                      </span>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-sp-3 overflow-hidden rounded-md px-sp-3 py-sp-2 text-sm transition-colors duration-150",
                      active
                        ? "bg-primary-soft font-medium text-primary"
                        : "text-ink-muted hover:bg-fill-subtle hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-pill bg-primary transition-transform duration-200",
                        active ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <Icon size={18} className={cn("shrink-0 transition-transform duration-150", !active && "group-hover:scale-110")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-sp-5">
          <Link href="/dashboard"><Logo /></Link>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile : bouton + drawer */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-sp-3 top-sp-3 z-40 flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-ink shadow-sm lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-surface shadow-lg animate-slide-in">
            <div className="flex h-16 items-center justify-between border-b border-line px-sp-5">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Fermer"><X size={20} className="text-ink-faint" /></button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
