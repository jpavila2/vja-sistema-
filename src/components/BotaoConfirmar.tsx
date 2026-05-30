"use client";

import { type ReactNode } from "react";

export function BotaoConfirmar({
  acao,
  mensagem,
  children,
  className = "",
  hidden,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  mensagem: string;
  children: ReactNode;
  className?: string;
  hidden?: Record<string, string | number>;
}) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm(mensagem)) e.preventDefault();
      }}
    >
      {hidden
        ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      <button type="submit" className={className}>{children}</button>
    </form>
  );
}
