"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Atualiza a tela em tempo real: assina as mudanças (insert/update/delete) das
 * tabelas indicadas e chama router.refresh() (com um pequeno atraso pra juntar
 * várias mudanças). Assim, o que um aparelho faz aparece nos outros sozinho.
 */
export function RealtimeRefresh({ tables, canal }: { tables: string[]; canal: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`rt-${canal}`);
    const agendar = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    for (const t of tables) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, agendar);
    }
    ch.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
    // canal identifica a assinatura; tables é estável por página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal]);

  return null;
}
