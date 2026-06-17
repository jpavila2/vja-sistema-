"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ItemCesta } from "@/lib/types";
import { type Comanda, novaComanda } from "@/lib/comandas";

const CHAVE = "vja:balanca:comandas:v1";
const CHAVE_ANTIGA = "vja:balanca:cesta:v1"; // rascunho de cesta única (versão anterior)

type Estado = { comandas: Comanda[]; ativaId: string };

function estadoInicial(): Estado {
  const c = novaComanda();
  return { comandas: [c], ativaId: c.id };
}

/** Lê o rascunho salvo no aparelho, migrando a cesta única antiga se existir. */
function carregar(): Estado {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const e = JSON.parse(raw) as Estado;
      if (e.comandas?.length) {
        const ativaId = e.comandas.some((c) => c.id === e.ativaId) ? e.ativaId : e.comandas[0].id;
        return { comandas: e.comandas, ativaId };
      }
    }
    // migração: havia uma cesta única salva? vira a primeira comanda
    const antigo = localStorage.getItem(CHAVE_ANTIGA);
    if (antigo) {
      const cesta = JSON.parse(antigo) as ItemCesta[];
      if (Array.isArray(cesta) && cesta.length > 0) {
        const c = novaComanda();
        c.cesta = cesta;
        localStorage.removeItem(CHAVE_ANTIGA);
        return { comandas: [c], ativaId: c.id };
      }
    }
  } catch {
    /* rascunho corrompido — começa limpo */
  }
  return estadoInicial();
}

/**
 * Dono das comandas (pesagens abertas) no aparelho. Mantém a lista, a comanda
 * ativa e a persistência (rascunho que sobrevive a recarregar/fechar a aba).
 * Sempre existe ao menos uma comanda ativa.
 */
export function useComandas() {
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setEstado(carregar());
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      /* localStorage cheio/indisponível — segue sem rascunho */
    }
  }, [estado, hidratado]);

  const ativa = estado.comandas.find((c) => c.id === estado.ativaId) ?? estado.comandas[0];

  const selecionar = useCallback((id: string) => {
    setEstado((e) => (e.comandas.some((c) => c.id === id) ? { ...e, ativaId: id } : e));
  }, []);

  const nova = useCallback(() => {
    setEstado((e) => {
      const c = novaComanda();
      return { comandas: [...e.comandas, c], ativaId: c.id };
    });
  }, []);

  const encerrar = useCallback((id: string) => {
    setEstado((e) => {
      const restantes = e.comandas.filter((c) => c.id !== id);
      if (restantes.length === 0) {
        const c = novaComanda();
        return { comandas: [c], ativaId: c.id };
      }
      const ativaId = e.ativaId === id ? restantes[0].id : e.ativaId;
      return { comandas: restantes, ativaId };
    });
  }, []);

  const patchAtiva = useCallback((patch: Partial<Comanda>) => {
    setEstado((e) => ({
      ...e,
      comandas: e.comandas.map((c) => (c.id === e.ativaId ? { ...c, ...patch } : c)),
    }));
  }, []);

  // mantém uma referência estável da comanda ativa para handlers que não querem
  // re-criar a cada render
  const ativaRef = useRef(ativa);
  ativaRef.current = ativa;

  return {
    comandas: estado.comandas,
    ativa,
    ativaId: estado.ativaId,
    hidratado,
    selecionar,
    nova,
    encerrar,
    patchAtiva,
    ativaRef,
  };
}
