"use client";

import { useState } from "react";

/**
 * Campo de dinheiro com máscara: o operador digita só números e o campo formata
 * sozinho (R$ 1.234,56), evitando confusão de ponto/vírgula. Envia o valor limpo
 * (ex.: "1234.56") no input escondido `name`, que a action lê com Number().
 */
export function CampoDinheiro({
  name, placeholder = "R$ 0,00", className = "", autoFocus, id, erro,
}: { name: string; placeholder?: string; className?: string; autoFocus?: boolean; id?: string; erro?: boolean }) {
  const [cents, setCents] = useState(0);
  const display = cents > 0
    ? (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "";
  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        aria-invalid={erro || undefined}
        value={display}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
          setCents(digits ? Number(digits) : 0);
        }}
        className={className + (erro ? " border-red-500 ring-1 ring-red-500 placeholder-red-400" : "")}
      />
      <input type="hidden" name={name} value={cents > 0 ? (cents / 100).toFixed(2) : ""} />
    </>
  );
}
