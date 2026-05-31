"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type LinkNav = { href: string; label: string };

export function HeaderNav({ links }: { links: LinkNav[] }) {
  const pathname = usePathname();
  const baseAtual = "/" + (pathname.split("/")[1] ?? "");

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const ativo = ("/" + (l.href.split("/")[1] ?? "")) === baseAtual;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
              (ativo ? "bg-marca-teal-light text-marca-teal-dark" : "text-slate-600 hover:bg-slate-100")
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
