-- =============================================================================
-- PECTIKÁ · Comentarios compartidos en Supabase
--
-- Cómo usarlo:
--   1. Crea un proyecto gratis en https://supabase.com
--   2. Abre "SQL Editor", pega TODO este archivo y pulsa "Run".
--   3. En Project Settings > API copia "Project URL" y la clave "anon public"
--      y pégalas en SUPABASE_URL y SUPABASE_ANON_KEY dentro de js/main.js.
--
-- Moderación: para ocultar un comentario, en "Table Editor" > comentarios
-- marca la columna "oculto" como true (o borra la fila).
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  texto       text not null,
  avatar      jsonb not null default '{}'::jsonb,
  me_gusta    integer not null default 0,
  me_encanta  integer not null default 0,
  oculto      boolean not null default false,
  created_at  timestamptz not null default now(),

  -- Filtro básico en el servidor (además del filtro de la página)
  constraint nombre_valido  check (char_length(btrim(nombre)) between 2 and 40),
  constraint texto_valido   check (char_length(btrim(texto)) between 3 and 400),
  constraint sin_enlaces    check (texto !~* '(https?://|www\.)' and nombre !~* '(https?://|www\.)'),
  constraint avatar_pequeno check (pg_column_size(avatar) < 200),
  constraint contadores_ok  check (me_gusta >= 0 and me_encanta >= 0)
);

create index if not exists comentarios_fecha_idx on public.comentarios (created_at desc);

-- -----------------------------------------------------------------------------
-- Seguridad: los visitantes solo pueden LEER comentarios visibles y PUBLICAR
-- nombre + texto + avatar. No pueden editar, borrar ni tocar los contadores.
-- -----------------------------------------------------------------------------
alter table public.comentarios enable row level security;

drop policy if exists "leer comentarios visibles" on public.comentarios;
create policy "leer comentarios visibles" on public.comentarios
  for select to anon, authenticated
  using (not oculto);

drop policy if exists "publicar comentarios" on public.comentarios;
create policy "publicar comentarios" on public.comentarios
  for insert to anon, authenticated
  with check (me_gusta = 0 and me_encanta = 0 and not oculto);

revoke all on public.comentarios from anon, authenticated;
grant select on public.comentarios to anon, authenticated;
grant insert (nombre, texto, avatar) on public.comentarios to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Anti-spam en el servidor: limpia espacios, evita comentarios repetidos
-- y frena avalanchas (máximo 10 comentarios por minuto en toda la web).
-- -----------------------------------------------------------------------------
create or replace function public.comentarios_antispam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.nombre := btrim(regexp_replace(new.nombre, '\s+', ' ', 'g'));
  new.texto  := btrim(new.texto);

  if (select count(*) from comentarios where created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Demasiados comentarios, intenta en un minuto';
  end if;

  if exists (
    select 1 from comentarios
    where lower(texto) = lower(new.texto)
      and created_at > now() - interval '1 day'
  ) then
    raise exception 'Comentario repetido';
  end if;

  return new;
end;
$$;

drop trigger if exists comentarios_antispam on public.comentarios;
create trigger comentarios_antispam
  before insert on public.comentarios
  for each row execute function public.comentarios_antispam();

-- -----------------------------------------------------------------------------
-- Reacciones "Me gusta" / "Me encanta" con contadores compartidos.
-- La página llama a esta función; solo suma o resta 1 y nunca baja de 0.
-- -----------------------------------------------------------------------------
create or replace function public.reaccionar(p_id uuid, p_tipo text, p_delta integer)
returns table (gusta integer, encanta integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta not in (-1, 1) or p_tipo not in ('me_gusta', 'me_encanta') then
    raise exception 'Reacción no válida';
  end if;

  if p_tipo = 'me_gusta' then
    update comentarios c set me_gusta = greatest(0, c.me_gusta + p_delta)
    where c.id = p_id and not c.oculto;
  else
    update comentarios c set me_encanta = greatest(0, c.me_encanta + p_delta)
    where c.id = p_id and not c.oculto;
  end if;

  return query
    select c.me_gusta, c.me_encanta from comentarios c
    where c.id = p_id and not c.oculto;
end;
$$;

revoke all on function public.reaccionar(uuid, text, integer) from public;
grant execute on function public.reaccionar(uuid, text, integer) to anon, authenticated;
