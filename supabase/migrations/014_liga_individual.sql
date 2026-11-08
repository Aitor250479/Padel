-- Liga individual: al empezar una liga se elige si es por parejas o individual.
-- Ejecutar en Supabase > SQL Editor después de 013_jugadores_activos.sql.
--
--  * Liga por parejas: todo igual que hasta ahora.
--  * Liga individual: cada semana se forman parejas nuevas entre los jugadores
--    disponibles. Cada pareja de un partido se guarda como una "pareja de liga"
--    (pairs.league_id no nulo) con sus dos jugadores (player_1, player_2), así
--    que resultados, reservas, clasificación y estadísticas funcionan igual.
--  * Las parejas fijas (league_id nulo) no se tocan y vuelven en la siguiente
--    liga por parejas.

-- 1. Tipo de liga
alter table public.leagues add column if not exists kind text not null default 'parejas';
alter table public.leagues drop constraint if exists leagues_kind_check;
alter table public.leagues add constraint leagues_kind_check check (kind in ('parejas', 'individual'));

-- 2. Parejas de una liga individual
alter table public.pairs add column if not exists league_id uuid references public.leagues(id) on delete cascade;
alter table public.pairs add column if not exists player_1 uuid references public.profiles(id) on delete set null;
alter table public.pairs add column if not exists player_2 uuid references public.profiles(id) on delete set null;

-- El nombre solo tiene que ser único entre las parejas fijas.
alter table public.pairs drop constraint if exists pairs_name_key;
create unique index if not exists pairs_name_fixed on public.pairs (name) where league_id is null;
create unique index if not exists pairs_league_players on public.pairs (league_id, least(player_1, player_2), greatest(player_1, player_2))
  where league_id is not null;

-- Nadie puede meterse en una pareja de liga individual con Parejas.
create or replace function public.check_profile_pair_fixed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.pair_id is not null and new.pair_id is distinct from old.pair_id
     and exists (select 1 from pairs where id = new.pair_id and league_id is not null) then
    raise exception 'Esa pareja es de una liga individual';
  end if;
  return new;
end
$$;

drop trigger if exists before_profile_pair_fixed on public.profiles;
create trigger before_profile_pair_fixed
  before update on public.profiles
  for each row execute function public.check_profile_pair_fixed();

-- Jugadores de una pareja (fija o de liga individual).
create or replace function public.pair_members(p uuid)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select id from profiles where pair_id = p
  union
  select x from pairs, unnest(array[player_1, player_2]) as x
    where pairs.id = p and pairs.league_id is not null and x is not null
$$;

-- ¿El usuario actual juega en esa pareja?
create or replace function public.in_pair(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p = public.my_pair_id()
      or exists (select 1 from pairs where id = p and league_id is not null and auth.uid() in (player_1, player_2))
$$;

-- 3. Permisos: "es de mi pareja" pasa a contar también las parejas de liga individual.
drop policy if exists "Jugadores del partido y organizadores lo editan" on public.matches;
create policy "Jugadores del partido y organizadores lo editan" on public.matches
  for update to authenticated
  using (public.is_organizer() or public.in_pair(pair_a) or public.in_pair(pair_b))
  with check (public.is_organizer() or public.in_pair(pair_a) or public.in_pair(pair_b));

drop policy if exists "Cada pareja propone su resultado" on public.match_results;
create policy "Cada pareja propone su resultado" on public.match_results
  for all to authenticated
  using (public.in_pair(pair_id) or public.is_organizer())
  with check (public.in_pair(pair_id) or public.is_organizer());

-- 4. Quién jugó: también los jugadores de las parejas de liga individual.
create or replace function public.record_match_players()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.sets_a is null or new.status = 'cancelado' then
    delete from match_players where match_id = new.id;
  elsif tg_op = 'INSERT' or old.sets_a is null or old.status = 'cancelado'
        or new.pair_a is distinct from old.pair_a or new.pair_b is distinct from old.pair_b then
    delete from match_players where match_id = new.id;
    insert into match_players (match_id, profile_id, pair_id)
    select new.id, x, new.pair_a from public.pair_members(new.pair_a) as x
    union
    select new.id, x, new.pair_b from public.pair_members(new.pair_b) as x
    on conflict do nothing;
  end if;
  return null;
end
$$;

-- 5. Partidos: igual que en 012, y además un jugador no puede tener dos partidos
--    la misma semana (en la liga individual cambia de pareja cada semana).
create or replace function public.check_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  syncing boolean := coalesce(current_setting('app.sync_result', true), 'off') = 'on';
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
       and not syncing then
      raise exception 'El resultado se introduce desde la ficha del partido';
    end if;
    new.created_at := old.created_at;
    if not syncing then
      new.result_at := old.result_at;
      new.result_by := old.result_by;
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

  if new.status <> 'cancelado' and exists (
    select 1 from public.pair_members(new.pair_a) a, public.pair_members(new.pair_b) b where a = b
  ) then
    raise exception 'Un jugador no puede estar en las dos parejas del partido';
  end if;

  if new.status <> 'cancelado'
     and (tg_op = 'INSERT' or new.pair_a is distinct from old.pair_a or new.pair_b is distinct from old.pair_b
          or new.week_start is distinct from old.week_start or old.status = 'cancelado')
     and exists (
    select 1 from matches m
    where m.week_start = new.week_start
      and m.id <> new.id
      and m.status <> 'cancelado'
      and m.league_id is not distinct from new.league_id
      and exists (
        select 1
        from (select public.pair_members(m.pair_a) union select public.pair_members(m.pair_b)) them(x)
        where x in (select public.pair_members(new.pair_a) union select public.pair_members(new.pair_b))
      )
  ) then
    raise exception 'Uno de los jugadores ya tiene partido esa semana';
  end if;

  return new;
end
$$;

-- 6. Pareja de liga individual para dos jugadores (la crea si no existe).
create or replace function public.league_pair(p1 uuid, p2 uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  lg uuid := public.current_league_id();
  pid uuid;
  nm text;
begin
  if not public.is_organizer() then
    raise exception 'Solo un organizador puede formar parejas';
  end if;
  if p1 is null or p2 is null or p1 = p2 then
    raise exception 'Elige dos jugadores distintos para cada pareja';
  end if;
  if (select kind from leagues where id = lg) is distinct from 'individual' then
    raise exception 'La liga en curso es por parejas';
  end if;

  select id into pid from pairs
    where league_id = lg and least(player_1, player_2) = least(p1, p2) and greatest(player_1, player_2) = greatest(p1, p2);
  if pid is not null then
    return pid;
  end if;

  select string_agg(coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1)), ' y ' order by x.o)
    into nm
    from unnest(array[p1, p2]) with ordinality as x(id, o)
    join profiles p on p.id = x.id;
  insert into pairs (name, league_id, player_1, player_2) values (coalesce(nm, 'Pareja'), lg, p1, p2) returning id into pid;
  return pid;
end
$$;

revoke all on function public.league_pair(uuid, uuid) from public;
grant execute on function public.league_pair(uuid, uuid) to authenticated;

-- 7. Empezar una liga nueva eligiendo el tipo.
drop function if exists public.start_new_league(text);

create or replace function public.start_new_league(new_name text, new_kind text default 'parejas')
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
  if new_kind not in ('parejas', 'individual') then
    raise exception 'Elige si la liga es por parejas o individual';
  end if;
  update leagues set ended_at = now() where ended_at is null;
  insert into leagues (name, kind) values (clean, new_kind) returning id into nid;
  return nid;
end
$$;

revoke all on function public.start_new_league(text, text) from public;
grant execute on function public.start_new_league(text, text) to authenticated;
