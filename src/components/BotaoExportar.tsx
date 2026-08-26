/**
 * Baixa o CSV de vendas ou compras de um dia (?dia=YYYY-MM-DD) ou de um mês (?mes=YYYY-MM).
 * É um link normal para a rota /api/exportar — o download acontece pelo próprio navegador.
 */
export function BotaoExportar({
  tipo,
  dia,
  mes,
  rotulo,
}: {
  tipo: "vendas" | "compras";
  dia?: string;
  mes?: string;
  rotulo?: string;
}) {
  const periodo = dia ? `dia=${dia}` : `mes=${mes}`;
  return (
    <a
      href={`/api/exportar?tipo=${tipo}&${periodo}`}
      className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold text-marca-navy hover:bg-slate-100"
    >
      ⬇️ {rotulo ?? "Exportar CSV"}
    </a>
  );
}
