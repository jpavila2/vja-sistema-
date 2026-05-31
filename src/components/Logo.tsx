/*
  Logo da marca. Hoje usa o emoji 🦁 como placeholder.
  Quando o arquivo `public/logo-leao.png` existir, trocar o <span do emoji> por:
    <img src="/logo-leao.png" alt="VJA Reciclagem" className="h-8 w-8 object-contain" />
*/
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={"flex items-center gap-2 " + className}>
      <span className="text-2xl leading-none" aria-hidden>
        🦁
      </span>
      <span className="text-lg font-extrabold tracking-tight text-marca-navy">
        <span className="text-marca-gold">VJA</span> Reciclagem
      </span>
    </span>
  );
}
