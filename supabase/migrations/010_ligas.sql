-- Ligas: cada partido pertenece a una liga. Solo hay una liga en curso
-- (ended_at is null). Reiniciar = cerrar la liga en curso y empezar otra con nombre.
-- Ejecutar después de 009_noticias_y_reinicio.sql.

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists leagues_one_current on public.leagues ((true)) where ended_at is null;

alter table public.leagues enable row level security;
drop policy if exists "Ver ligas" on public.leagues;
create policy "Ver ligas" on public.leagues for select to authenticated using (true);
drop policy if exists "Organizadores gestionan ligas" on public.leagues;
create policy "Organizadores gestionan ligas" on public.leagues
  for all to authenticated using (public.is_organizer()) with check (public.is_organizer());

-- Liga inicial con los partidos que ya existen.
insert into public.leagues (name)
select 'Primera liga' where not exists (select 1 from public.leagues);

create or replace function public.current_league_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select id from leagues where ended_at is null limit 1 $$;

alter table public.matches add column if not exists league_id uuid references public.leagues(id);
update public.matches set league_id = public.current_league_id() where league_id is null;
alter table public.matches alter column league_id set default public.current_league_id();
create index if not exists matches_league_idx on public.matches (league_id);

-- Un partido por pareja y semana, dentro de la misma liga.
create or replace function public.check_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.league_id is null then
    new.league_id := public.current_league_id();
  end if;

  if new.status <> 'cancelado' then
    new.status := case when new.sets_a is not null then 'jugado' else 'programado' end;
  end if;

  if tg_op = 'UPDATE' and new.sets_a is distinct from old.sets_a
     or tg_op = 'UPDATE' and new.sets_b is distinct from old.sets_b then
    new.result_by := auth.uid();
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_organizer() then
    if new.week_start is distinct from old.week_start
       or new.pair_a is distinct from old.pair_a
       or new.pair_b is distinct from old.pair_b
       or new.slot_day is distinct from old.slot_day
       or new.slot_hour is distinct from old.slot_hour
       or new.league_id is distinct from old.league_id
       or (new.status = 'cancelado') is distinct from (old.status = 'cancelado') then
      raise exception 'Solo un organizador puede cambiar el emparejamiento';
    end if;
    if (new.sets_a is distinct from old.sets_a
        or new.sets_b is distinct from old.sets_b
        or new.score_detail is distinct from old.score_detail)
       and coalesce(current_setting('app.sync_result', true), 'off') <> 'on' then
      raise exception 'El resultado se introduce desde la ficha del partido';
    end if;
  end if;

  if new.status <> 'cancelado' and exists (
    select 1 from matches m
    where m.week_start = new.week_start
      and m.id <> new.id
      and m.status <> 'cancelado'
      and m.league_id is not distinct from new.league_id
      and (m.pair_a in (new.pair_a, new.pair_b) or m.pair_b in (new.pair_a, new.pair_b))
  ) then
    raise exception 'Una de las parejas ya tiene partido esa semana';
  end if;

  return new;
end
$$;

-- Empezar una liga nueva: cierra la liga en curso (sus resultados se conservan).
drop function if exists public.reset_league();

create or replace function public.start_new_league(new_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  clean text := trim(new_name);
  nid uuid;
begin
  if not public.is_organizer() then
    raise exception 'Solo un organizador puede empezar una liga nueva';
  end if;
  if clean is null or clean = '' then
    raise exception 'Ponle un nombre a la nueva liga';
  end if;
  update leagues set ended_at = now() where ended_at is null;
  insert into leagues (name) values (clean) returning id into nid;
  return nid;
end
$$;

revoke all on function public.start_new_league(text) from public;
grant execute on function public.start_new_league(text) to authenticated;
