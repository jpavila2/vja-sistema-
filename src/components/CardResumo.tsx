import { type ReactNode } from "react";

export function CardResumo({ titulo, valor, cor = "navy", sufixo }: {
  titulo: string;
  valor: ReactNode;
  cor?: "navy" | "teal" | "green" | "gold";
  sufixo?: string;
}) {
  const cores = {
    navy: "text-marca-navy",
    teal: "text-marca-teal-dark",
    green: "text-marca-green-dark",
    gold: "text-marca-gold",
  } as const;
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{titulo}</div>
      <div className={"mt-1 text-3xl font-black " + cores[cor]}>
        {valor}
        {sufixo && <span className="ml-1 text-base font-semibold">{sufixo}</span>}
      </div>
    </div>
  );
}
