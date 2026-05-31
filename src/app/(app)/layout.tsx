import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rotaPermitida, type Papel } from "@/lib/auth";
import { HeaderNav, type LinkNav } from "@/components/HeaderNav";
import { sair } from "./actions";
import { Logo } from "@/components/Logo";

const TODOS_LINKS: LinkNav[] = [
  { href: "/", label: "Painel" },
  { href: "/escritorio", label: "Escritório" },
  { href: "/balanca", label: "Balança" },
];

const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Administrador",
  escritorio: "Escritório",
  balanca: "Balança",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, papel")
    .eq("id", user.id)
    .single();

  const papel = (profile?.papel as Papel) ?? "balanca";
  const links = TODOS_LINKS.filter((l) => rotaPermitida(papel, l.href));

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-white px-5 py-3 shadow-sm">
        <Logo />
        <HeaderNav links={links} />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-600">
            {profile?.nome} · {PAPEL_LABEL[papel]}
          </span>
          <form action={sair}>
            <button
              type="submit"
              className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-marca-navy hover:bg-slate-100"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
