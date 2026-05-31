import Link from "next/link";

export default function EscritorioPage() {
  const cards = [
    { href: "/escritorio/materiais", titulo: "Materiais", desc: "Catálogo e preços" },
    { href: "/escritorio/pessoas", titulo: "Pessoas", desc: "Catadores e clientes" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Escritório</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border bg-white p-5 shadow-sm hover:border-marca-teal"
          >
            <div className="text-lg font-bold">{c.titulo}</div>
            <div className="text-sm text-slate-500">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
