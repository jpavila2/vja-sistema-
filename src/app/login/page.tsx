"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";
import { Logo } from "@/components/Logo";

const estadoInicial = { erro: "" };

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-marca-teal py-3 text-lg font-bold text-white hover:bg-marca-teal-dark disabled:opacity-50"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, estadoInicial);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <Logo className="justify-center" />
        <p className="text-center text-sm text-slate-500">Gestão de reciclagem</p>
        <input name="email" type="email" required placeholder="E-mail"
          className="w-full rounded-xl border p-3 text-lg" />
        <input name="senha" type="password" required placeholder="Senha"
          className="w-full rounded-xl border p-3 text-lg" />
        {state?.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}
        <Botao />
      </form>
    </main>
  );
}
