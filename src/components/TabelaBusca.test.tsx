import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabelaBusca } from "@/components/TabelaBusca";

type Item = { nome: string };
const itens: Item[] = [{ nome: "Alumínio" }, { nome: "Cobre" }, { nome: "Ferro" }];

describe("TabelaBusca", () => {
  it("renderiza todos e filtra pela busca", () => {
    render(
      <TabelaBusca<Item>
        itens={itens}
        campoBusca={(i) => i.nome}
        colunas={[{ titulo: "Nome", render: (i) => i.nome }]}
      />,
    );
    expect(screen.getByText("Alumínio")).toBeInTheDocument();
    expect(screen.getByText("Cobre")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "cob" } });
    expect(screen.getByText("Cobre")).toBeInTheDocument();
    expect(screen.queryByText("Alumínio")).not.toBeInTheDocument();
  });

  it("mostra mensagem de vazio quando nada casa", () => {
    render(
      <TabelaBusca<Item>
        itens={itens}
        campoBusca={(i) => i.nome}
        colunas={[{ titulo: "Nome", render: (i) => i.nome }]}
        vazio="Nada aqui"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "zzz" } });
    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
  });
});
