import { type ReactNode } from "react";
import Link from "next/link";

export function CardResumo({ titulo, valor, cor = "navy", sufixo, href }: {
  titulo: string;
  valor: ReactNode;
  cor?: "navy" | "teal" | "green" | "gold";
  sufixo?: string;
  href?: string;
}) {
  const cores = {
    navy: "text-marca-navy",
    teal: "text-marca-teal-dark",
    green: "text-marca-green-dark",
    gold: "text-marca-gold",
  } as const;

  const base = "block rounded-2xl border bg-white p-5 shadow-sm";
  const conteudo = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{titulo}</span>
        {href ? <span className="text-xs font-bold text-marca-teal opacity-0 transition-opacity group-hover:opacity-100">ver →</span> : null}
      </div>
      <div className={"mt-1 text-3xl font-black " + cores[cor]}>
        {valor}
        {sufixo && <span className="ml-1 text-base font-semibold">{sufixo}</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={base + " group transition hover:border-marca-teal hover:shadow-md"}>
        {conteudo}
      </Link>
    );
  }
  return <div className={base}>{conteudo}</div>;
}
