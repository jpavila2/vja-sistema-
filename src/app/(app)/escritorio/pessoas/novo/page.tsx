import Link from "next/link";
import { FormPessoa } from "../FormPessoa";

export default function NovaPessoaPage() {
  return (
    <div className="space-y-4">
      <Link href="/escritorio/pessoas" className="text-blue-600">← Voltar</Link>
      <h1 className="text-2xl font-bold">Nova pessoa</h1>
      <FormPessoa />
    </div>
  );
}
