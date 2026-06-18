"use client";

import { useCallback, useEffect, useState } from "react";

const CHAVE = "vja:balanca:recibos:v1";
const LIMITE = 30; // guarda só as últimas N compras do aparelho

export type ReciboItem = {
  nome: string; emoji: string | null; unidade: string;
  peso: number; preco: number; subtotal: number;
};
export type Recibo = {
  id: string;
  quando: number;
  catador: string;
  itens: ReciboItem[];
  total: number;
  status: "enviado" | "fila"; // enviado = no sistema; fila = aguardando internet
};

function carregar(): Recibo[] {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const l = JSON.parse(raw) as Recibo[];
      if (Array.isArray(l)) return l;
    }
  } catch {
    /* histórico corrompido — começa vazio */
  }
  return [];
}

/**
 * Histórico local das últimas compras finalizadas neste aparelho. Serve para
 * reconsultar/anotar uma compra logo após finalizar (a balança não lê o
 * financeiro no banco). Não substitui o registro oficial — é uma cópia local.
 */
export function useRecibos() {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setRecibos(carregar());
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(recibos));
    } catch {
      /* localStorage indisponível */
    }
  }, [recibos, hidratado]);

  const adicionar = useCallback((r: Recibo) => {
    setRecibos((rs) => [r, ...rs].slice(0, LIMITE));
  }, []);

  return { recibos, adicionar };
}
