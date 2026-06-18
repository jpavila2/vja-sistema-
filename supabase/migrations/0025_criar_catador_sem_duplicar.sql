-- Migration: criar_catador sem duplicar
-- Antes, "Cadastro rápido" / botão + criava sempre um novo fornecedor, gerando
-- duplicatas (ex.: dois "Rosa") — e os preços salvos ficavam no gêmeo errado.
-- Agora, se já existir um fornecedor/ambos com o mesmo nome (sem diferenciar
-- maiúsculas/espaços), reaproveita o existente em vez de criar outro.
-- Projeto "sistema VJA".

create or replace function public.criar_catador(p_nome text, p_telefone text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_papel text;
  v_id bigint;
  v_nome text := btrim(coalesce(p_nome, ''));
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select papel into v_papel from public.profiles where id = v_uid;
  if v_papel is null then raise exception 'usuário sem perfil'; end if;
  if v_nome = '' then raise exception 'informe o nome do catador'; end if;

  -- reaproveita um fornecedor existente com o mesmo nome (case/espaço-insensível)
  select id into v_id from public.people
   where tipo in ('fornecedor','ambos') and lower(btrim(nome)) = lower(v_nome)
   order by id limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.people (nome, tipo, telefone)
  values (v_nome, 'fornecedor', nullif(btrim(coalesce(p_telefone,'')), ''))
  returning id into v_id;
  return v_id;
end; $$;

revoke execute on function public.criar_catador(text, text) from public, anon;
grant execute on function public.criar_catador(text, text) to authenticated;
