-- Migration: catador_precos
-- Preço de compra de cada material POR catador (sobrepõe o preço de tabela).
-- Leitura liberada a qualquer autenticado (a balança roda como papel 'balanca');
-- escrita só via funções SECURITY DEFINER (criar_catador, salvar_precos_catador),
-- que checam apenas que o usuário tem perfil — assim a balança também pode usar.
-- Projeto "sistema VJA". Aplicar via MCP em 2026-06-09.

create table if not exists public.catador_precos (
  pessoa_id   bigint not null references public.people(id) on delete cascade,
  material_id bigint not null references public.materials(id) on delete cascade,
  preco_compra numeric(12,2) not null check (preco_compra >= 0),
  updated_at  timestamptz not null default now(),
  primary key (pessoa_id, material_id)
);
create index if not exists catador_precos_pessoa_idx on public.catador_precos (pessoa_id);

alter table public.catador_precos enable row level security;
-- leitura: qualquer autenticado (inclui o operador da balança)
create policy catador_precos_read on public.catador_precos for select to authenticated using (true);
-- escrita direta só admin/escritório (a balança escreve via RPC SECURITY DEFINER)
create policy catador_precos_write on public.catador_precos for all to authenticated
  using ((select private.user_role()) in ('admin','escritorio'))
  with check ((select private.user_role()) in ('admin','escritorio'));

-- Cria um catador (fornecedor) na hora, sem esperar finalizar a compra.
create or replace function public.criar_catador(p_nome text, p_telefone text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_papel text;
  v_id bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid;
  if v_papel is null then raise exception 'usuário sem perfil'; end if;
  if coalesce(btrim(p_nome), '') = '' then raise exception 'informe o nome do catador'; end if;
  insert into public.people (nome, tipo, telefone)
  values (btrim(p_nome), 'fornecedor', nullif(btrim(coalesce(p_telefone,'')), ''))
  returning id into v_id;
  return v_id;
end; $$;

revoke execute on function public.criar_catador(text, text) from public, anon;
grant execute on function public.criar_catador(text, text) to authenticated;

-- Salva/atualiza os preços de um catador. p_precos = [{material_id, preco}].
-- preco null => remove o preço próprio (volta ao preço de tabela).
create or replace function public.salvar_precos_catador(p_pessoa_id bigint, p_precos jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_papel text;
  v_item jsonb;
  v_mat bigint;
  v_preco numeric(12,2);
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid;
  if v_papel is null then raise exception 'usuário sem perfil'; end if;
  if not exists (select 1 from public.people where id = p_pessoa_id) then
    raise exception 'catador não encontrado';
  end if;
  if p_precos is null or jsonb_typeof(p_precos) <> 'array' then return; end if;

  for v_item in select * from jsonb_array_elements(p_precos) loop
    v_mat := (v_item->>'material_id')::bigint;
    if v_item->>'preco' is null then
      delete from public.catador_precos where pessoa_id = p_pessoa_id and material_id = v_mat;
    else
      v_preco := (v_item->>'preco')::numeric;
      if v_preco < 0 then continue; end if;
      insert into public.catador_precos (pessoa_id, material_id, preco_compra, updated_at)
      values (p_pessoa_id, v_mat, v_preco, now())
      on conflict (pessoa_id, material_id)
      do update set preco_compra = excluded.preco_compra, updated_at = now();
    end if;
  end loop;
end; $$;

revoke execute on function public.salvar_precos_catador(bigint, jsonb) from public, anon;
grant execute on function public.salvar_precos_catador(bigint, jsonb) to authenticated;
