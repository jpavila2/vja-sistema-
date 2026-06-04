"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/escritorio/caixa",       icone: "💰", label: "Caixa do dia" },
  { href: "/escritorio/vendas",      icone: "📦", label: "Vendas" },
  { href: "/escritorio/conferencia", icone: "✅", label: "Conferência" },
  { href: "/escritorio/materiais",   icone: "🏷️", label: "Materiais" },
  { href: "/escritorio/pessoas",     icone: "👥", label: "Pessoas" },
  { href: "/escritorio/relatorio",   icone: "📊", label: "Relatório" },
];

export function EscritorioNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {ITENS.map((it) => {
        const ativo = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={ativo ? "page" : undefined}
            className={
              "flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-4 py-3 transition-colors " +
              (ativo
                ? "border-marca-teal bg-marca-teal text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-marca-teal hover:text-marca-teal-dark")
            }
          >
            <span className="text-2xl leading-none">{it.icone}</span>
            <span className="whitespace-nowrap text-xs font-bold">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
