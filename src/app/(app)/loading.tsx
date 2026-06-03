// Skeleton instantâneo: aparece na hora em qualquer troca de aba enquanto o
// servidor busca os dados. Sem isso, a navegação "trava" esperando as queries.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="h-12 w-40 rounded-full bg-slate-200" />
        <div className="h-12 w-36 rounded-full bg-slate-200" />
        <div className="h-12 w-32 rounded-full bg-slate-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-64 rounded-2xl bg-slate-200" />
      <div className="h-48 rounded-2xl bg-slate-200" />
    </div>
  );
}
