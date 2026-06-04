"use client";

// Tela de erro amigável: em vez da tela técnica do Next, mostra uma mensagem
// simples com botão de tentar de novo. Pega qualquer erro de ação/carregamento
// nas páginas do app.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">😕</div>
      <h2 className="text-xl font-extrabold text-marca-navy">Algo deu errado</h2>
      <p className="max-w-sm text-slate-500">
        Não foi possível concluir agora. Pode ser internet ou um detalhe do sistema.
        Toque para tentar de novo.
      </p>
      <div className="flex gap-3">
        <button onClick={() => reset()}
          className="rounded-full bg-marca-teal px-6 py-3 font-bold text-white hover:bg-marca-teal-dark">
          Tentar de novo
        </button>
        <a href="/escritorio/caixa"
          className="rounded-full border px-6 py-3 font-bold text-marca-navy hover:bg-slate-100">
          Voltar ao caixa
        </a>
      </div>
    </div>
  );
}
