"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Igual ao useState, mas guarda o valor no próprio aparelho (localStorage).
 * Serve de rascunho automático: se fechar/atualizar a tela, o que estava
 * digitado volta. Não grava no banco — só vira registro quando você confirma.
 *
 * O terceiro retorno (`hidratado`) avisa quando o valor salvo já foi carregado,
 * útil pra evitar limpar o rascunho antes de lê-lo.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initial);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setState(JSON.parse(raw) as T);
    } catch {
      /* ignora rascunho corrompido */
    }
    setHidratado(true);
  }, [key]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* localStorage cheio/indisponível — segue sem rascunho */
    }
  }, [key, state, hidratado]);

  return [state, setState, hidratado];
}
