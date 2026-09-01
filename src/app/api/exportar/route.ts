import { NextResponse } from "next/server";
import { exigirPapel } from "@/lib/supabase/guard";
import { limitesDoDiaBR, limitesMes } from "@/lib/datas";
import { montarCSV, numeroBR } from "@/lib/exportar";
import { buscarTudo } from "@/lib/supabase/paginar";

const FORMA: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX", transferencia: "Transferência",
  boleto: "Boleto", cheque: "Cheque", prazo: "A prazo", misto: "Misto",
};

type ItemVenda = {
  peso: number; preco_unitario: number; subtotal: number;
  materials: { nome: string; unidade: string } | null;
};
type ItemCompra = {
  peso_bruto: number; peso_liquido: number; preco_unitario: number; subtotal: number;
  materials: { nome: string; unidade: string } | null;
};

function dataHoraBR(iso: string) {
  const d = new Date(iso);
  return {
    data: d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    hora: d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const dia = searchParams.get("dia");
  const mes = searchParams.get("mes");

  if (tipo !== "vendas" && tipo !== "compras") {
    return NextResponse.json({ erro: "Use tipo=vendas ou tipo=compras." }, { status: 400 });
  }

  let periodo: { inicio: string; fim: string };
  let sufixo: string;
  if (dia && /^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    periodo = limitesDoDiaBR(dia);
    sufixo = dia;
  } else if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    periodo = limitesMes(mes);
    sufixo = mes;
  } else {
    return NextResponse.json({ erro: "Informe dia=YYYY-MM-DD ou mes=YYYY-MM." }, { status: 400 });
  }

  // O middleware não protege /api/*: quem confere sessão e papel é a própria rota.
  let supabase;
  try {
    ({ supabase } = await exigirPapel(["admin", "escritorio"]));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sem acesso.";
    return NextResponse.json({ erro: msg }, { status: msg.includes("autenticado") ? 401 : 403 });
  }

  let cabecalho: string[];
  let linhas: (string | number | null)[][];

  if (tipo === "vendas") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any[];
    try {
      data = await buscarTudo((de, ate) => supabase
        .from("sales")
        .select("id, data_hora, total, status, forma_pagamento, observacoes, people(nome), sale_items(peso, preco_unitario, subtotal, materials(nome, unidade))", { count: "exact" })
        .gte("data_hora", periodo.inicio)
        .lt("data_hora", periodo.fim)
        .order("data_hora", { ascending: true })
        .order("id", { ascending: true })   // desempate: sem isso a paginação pode pular/repetir linha
        .range(de, ate));
    } catch (e) {
      return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro ao buscar vendas." }, { status: 500 });
    }

    cabecalho = ["Venda", "Data", "Hora", "Cliente", "Pagamento", "Status",
      "Material", "Peso", "Unidade", "Preço unitário", "Subtotal", "Total da venda", "Observações"];
    linhas = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const v of data) {
      const { data: dt, hora } = dataHoraBR(v.data_hora);
      const itens = (v.sale_items as ItemVenda[]) ?? [];
      const base = [v.id, dt, hora, v.people?.nome ?? "—",
        FORMA[v.forma_pagamento] ?? v.forma_pagamento, v.status];
      if (itens.length === 0) {
        linhas.push([...base, "—", "", "", "", "", numeroBR(Number(v.total)), v.observacoes ?? ""]);
        continue;
      }
      for (const it of itens) {
        linhas.push([...base,
          it.materials?.nome ?? "—",
          numeroBR(Number(it.peso), 3),
          it.materials?.unidade ?? "",
          numeroBR(Number(it.preco_unitario)),
          numeroBR(Number(it.subtotal)),
          numeroBR(Number(v.total)),
          v.observacoes ?? "",
        ]);
      }
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any[];
    try {
      data = await buscarTudo((de, ate) => supabase
        .from("purchases")
        .select("id, data_hora, total, status, forma_pagamento, observacoes, people(nome), purchase_items(peso_bruto, peso_liquido, preco_unitario, subtotal, materials(nome, unidade))", { count: "exact" })
        .gte("data_hora", periodo.inicio)
        .lt("data_hora", periodo.fim)
        .order("data_hora", { ascending: true })
        .order("id", { ascending: true })   // desempate: sem isso a paginação pode pular/repetir linha
        .range(de, ate));
    } catch (e) {
      return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro ao buscar compras." }, { status: 500 });
    }

    cabecalho = ["Compra", "Data", "Hora", "Catador", "Pagamento", "Status",
      "Material", "Peso bruto", "Peso líquido", "Unidade", "Preço unitário", "Subtotal", "Total da compra", "Observações"];
    linhas = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of data) {
      const { data: dt, hora } = dataHoraBR(c.data_hora);
      const itens = (c.purchase_items as ItemCompra[]) ?? [];
      const base = [c.id, dt, hora, c.people?.nome ?? "—",
        FORMA[c.forma_pagamento] ?? c.forma_pagamento, c.status];
      if (itens.length === 0) {
        linhas.push([...base, "—", "", "", "", "", "", numeroBR(Number(c.total)), c.observacoes ?? ""]);
        continue;
      }
      for (const it of itens) {
        linhas.push([...base,
          it.materials?.nome ?? "—",
          numeroBR(Number(it.peso_bruto), 3),
          numeroBR(Number(it.peso_liquido), 3),
          it.materials?.unidade ?? "",
          numeroBR(Number(it.preco_unitario)),
          numeroBR(Number(it.subtotal)),
          numeroBR(Number(c.total)),
          c.observacoes ?? "",
        ]);
      }
    }
  }

  const csv = montarCSV(cabecalho, linhas);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}-${sufixo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
