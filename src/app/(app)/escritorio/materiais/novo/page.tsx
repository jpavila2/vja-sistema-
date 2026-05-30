import Link from "next/link";
import { FormMaterial } from "../FormMaterial";

export default function NovoMaterialPage() {
  return (
    <div className="space-y-4">
      <Link href="/escritorio/materiais" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Novo material</h1>
      <FormMaterial />
    </div>
  );
}
