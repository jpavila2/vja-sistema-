"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompraPayload } from "@/lib/comandas";

const CHAVE = "vja:balanca:fila:v1";

export type ResultadoEnvio = { ok: true; id: number } | { ok: false; erro: string };

function carregar(): CompraPayload[] {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const l = JSON.parse(raw) as CompraPayload[];
      if (Array.isArray(l)) return l;
    }
  } catch {
    /* fila corrompida — começa vazia */
  }
  return [];
}

/**
 * Fila de envio (outbox) das compras finalizadas sem internet. Cada item é um
 * payload pronto, com seu client_request_id (idempotente: reenviar não duplica).
 * Reenvia sozinho quando a internet volta, periodicamente e ao carregar a tela.
 *
 * `enviar` é a server action registrarCompra, injetada para manter o hook
 * desacoplado. Item só sai da fila quando o envio retorna ok.
 */
export function useFilaEnvio(enviar: (p: CompraPayload) => Promise<ResultadoEnvio>) {
  const [fila, setFila] = useState<CompraPayload[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const enviando = useRef(false);
  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;

  useEffect(() => {
    setFila(carregar());
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(fila));
    } catch {
      /* localStorage indisponível */
    }
  }, [fila, hidratado]);

  const enfileirar = useCallback((payload: CompraPayload) => {
    setFila((f) => [...f, payload]);
  }, []);

  /** Tenta enviar todos os pendentes; remove da fila os que subirem com sucesso. */
  const sincronizar = useCallback(async () => {
    if (enviando.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    enviando.current = true;
    try {
      const pendentes = carregar();
      for (const p of pendentes) {
        try {
          const res = await enviarRef.current(p);
          if (res.ok) {
            setFila((f) => f.filter((x) => x.client_request_id !== p.client_request_id));
          }
          // res.ok === false: mantém na fila e tenta de novo depois
        } catch {
          // sem rede / falha de transporte: para o ciclo e tenta mais tarde
          break;
        }
      }
    } finally {
      enviando.current = false;
    }
  }, []);

  // gatilhos de sincronização: ao montar, ao voltar a internet e a cada 25s
  useEffect(() => {
    if (!hidratado) return;
    sincronizar();
    const onOnline = () => sincronizar();
    window.addEventListener("online", onOnline);
    const t = setInterval(() => {
      if (fila.length > 0) sincronizar();
    }, 25000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(t);
    };
  }, [hidratado, fila.length, sincronizar]);

  return { pendentes: fila.length, enfileirar, sincronizar };
}
