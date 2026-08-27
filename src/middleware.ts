import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rotaPermitida, rotaInicial, type Papel } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isLogin = path === "/login";

  // Rotas de dados (/api/*) se protegem sozinhas: conferem a sessão e devolvem
  // 401/403 em JSON. Passar por aqui só transformaria isso num redirect, que o
  // navegador segue silenciosamente e quebra downloads (ex.: exportação de CSV).
  if (path.startsWith("/api/")) return response;

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("papel")
      .eq("id", user.id)
      .single();
    const papel = profile?.papel as Papel | undefined;

    if (isLogin && papel) {
      return NextResponse.redirect(new URL(rotaInicial(papel), request.url));
    }
    if (papel && !isLogin && !rotaPermitida(papel, path)) {
      return NextResponse.redirect(new URL(rotaInicial(papel), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
