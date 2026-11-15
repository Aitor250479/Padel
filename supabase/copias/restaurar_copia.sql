-- Restaurar la copia de seguridad (copia_seguridad.sql).
-- SOLO si algo ha ido mal: deja los datos exactamente como estaban al hacer
-- la copia. Lo que se haya cambiado después (resultados, votos...) se pierde.
-- Ejecutar en Supabase > SQL Editor.
--
-- 1) Deshace la migración 023 (ligas y categorías) si se llegó a ejecutar.
-- 2) Vacía las tablas y las vuelve a llenar con la copia.

-- Todo o nada: si algo falla, no se cambia nada.
begin;

-- 1. Deshacer 023
drop trigger if exists before_league_category on public.leagues;
drop function if exists public.set_league_category();
drop index if exists public.leagues_one_current_per_category;
alter table public.leagues drop column if exists category_id;
create unique index if not exists leagues_one_current on public.leagues ((true)) where ended_at is null;
alter table public.profiles drop column if exists category_id;
alter table public.profiles drop column if exists is_superadmin;
alter table public.polls drop column if exists category_id;
alter table public.news_items drop column if exists category_id;
alter table public.friendly_matches drop column if exists competition_id;
drop table if exists public.categories;
drop table if exists public.competitions;
drop function if exists public.is_superadmin();
drop function if exists public.default_competition_id();
drop function if exists public.default_category_id();

-- Reglas de perfiles como estaban en 013.
create or replace function public.check_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_organizer() then
    if new.is_organizer is distinct from old.is_organizer
       or new.pair_id is distinct from old.pair_id
       or new.active is distinct from old.active then
      raise exception 'Solo un organizador puede cambiar parejas, roles o desactivar jugadores';
    end if;
    if new.email is distinct from old.email
       and coalesce(current_setting('app.email_change', true), '') <> 'on' then
      raise exception 'El email se cambia desde Mi perfil';
    end if;
  end if;

  -- Desactivado: fuera de su pareja y sin rol de organizador.
  if not new.active then
    new.pair_id := null;
    new.is_organizer := false;
  end if;

  if new.pair_id is not null
     and new.pair_id is distinct from old.pair_id
     and (select count(*) from profiles where pair_id = new.pair_id and id <> new.id) >= 2 then
    raise exception 'Una pareja solo puede tener 2 jugadores';
  end if;

  return new;
end
$$;

-- 2. Volver a llenar las tablas con la copia (sin disparar las reglas automáticas).
set local session_replication_role = replica;

do $$
declare
  t text;
  cols text;
  lista text;
begin
  select string_agg(format('public.%I', c.relname), ', ')
    into lista
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where c.relkind = 'r'
      and exists (select 1 from pg_tables where schemaname = 'copia_2026_11' and tablename = c.relname);
  if lista is null then
    raise exception 'No hay copia de seguridad (esquema copia_2026_11)';
  end if;
  execute 'truncate table ' || lista;

  for t in select tablename from pg_tables where schemaname = 'copia_2026_11' loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      select string_agg(format('%I', a.column_name), ', ' order by a.ordinal_position)
        into cols
        from information_schema.columns a
        where a.table_schema = 'public' and a.table_name = t
          and exists (select 1 from information_schema.columns b
                      where b.table_schema = 'copia_2026_11' and b.table_name = t and b.column_name = a.column_name);
      execute format('insert into public.%I (%s) select %s from copia_2026_11.%I', t, cols, cols, t);
    end if;
  end loop;
end
$$;

commit;

select 'Copia restaurada' as resultado;
