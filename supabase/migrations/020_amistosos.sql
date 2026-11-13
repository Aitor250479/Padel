-- Partidos amistosos.
-- Ejecutar en Supabase > SQL Editor después de 019_noticias_600.sql.
--
--  * Cualquier jugador (también los desactivados) crea un amistoso con su fecha
--    y hora (hora de Madrid) y, si quiere, el lugar. Quien lo crea queda
--    apuntado en el primer hueco.
--  * Hay 4 huecos: 2 por pareja. Cada jugador se apunta a sí mismo en un hueco
--    libre, puede cambiarse de hueco o desapuntarse hasta la hora del partido.
--    Los organizadores pueden apuntar o quitar a cualquiera.
--  * Solo quien lo creó (o un organizador) cambia la fecha, la hora o el lugar,
--    o lo borra. Si el creador se desapunta, el partido pasa al siguiente que
--    se apuntó; si no queda nadie, el partido se borra.
--  * Pasada la hora, cualquiera de los 4 pone o corrige el resultado (sin
--    confirmación). Solo si el partido tenía los 4 jugadores.
--  * No afecta a la liga ni a la clasificación.

create table if not exists public.friendly_matches (
  id uuid primary key default gen_random_uuid(),
  -- Hora local de Madrid, como la reserva de los partidos de liga.
  play_at timestamp not null,
  place text check (place is null or length(place) <= 200),
  sets_a smallint,
  sets_b smallint,
  score_detail text check (score_detail is null or length(score_detail) <= 40),
  result_by uuid references public.profiles(id) on delete set null,
  result_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint friendly_result_check check (
    (sets_a is null and sets_b is null)
    or (sets_a, sets_b) in ((2, 0), (2, 1), (1, 1), (1, 2), (0, 2))
  )
);

create table if not exists public.friendly_players (
  match_id uuid not null references public.friendly_matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  side text not null check (side in ('a', 'b')),
  slot smallint not null check (slot in (1, 2)),
  joined_at timestamptz not null default now(),
  primary key (match_id, profile_id),
  -- Un jugador por hueco: como mucho 4 por partido, aunque se apunten a la vez.
  unique (match_id, side, slot)
);

create index if not exists friendly_matches_play_at on public.friendly_matches (play_at);
create index if not exists friendly_players_profile on public.friendly_players (profile_id);

-- ¿Ha llegado ya la hora del partido?
create or replace function public.friendly_started(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select (now() at time zone 'Europe/Madrid') >= play_at from friendly_matches where id = p), true)
$$;

-- ¿Está el usuario actual apuntado a ese amistoso?
create or replace function public.in_friendly(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from friendly_players where match_id = p and profile_id = auth.uid())
$$;

-- 1. Reglas del partido
create or replace function public.check_friendly_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  madrid timestamp := now() at time zone 'Europe/Madrid';
  syncing boolean := coalesce(current_setting('app.friendly_sync', true), 'off') = 'on';
  players int;
begin
  if tg_op = 'INSERT' then
    new.sets_a := null;
    new.sets_b := null;
    new.score_detail := null;
    new.result_by := null;
    new.result_at := null;
    new.created_at := now();
    if auth.uid() is not null and not public.is_organizer() then
      new.created_by := auth.uid();
      if new.play_at <= madrid then
        raise exception 'La fecha y hora del amistoso tienen que ser futuras';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.id <> old.id or new.created_at <> old.created_at then
    raise exception 'Eso no se puede cambiar';
  end if;

  if auth.uid() is not null and not public.is_organizer() and not syncing then
    if new.created_by is distinct from old.created_by then
      raise exception 'Eso no se puede cambiar';
    end if;
    if new.play_at <> old.play_at or new.place is distinct from old.place then
      if old.created_by is distinct from auth.uid() then
        raise exception 'Solo quien creó el amistoso puede cambiar la fecha, la hora o el lugar';
      end if;
      if old.play_at <= madrid then
        raise exception 'El amistoso ya se ha jugado: no se puede cambiar la fecha';
      end if;
      if new.play_at <= madrid then
        raise exception 'La fecha y hora del amistoso tienen que ser futuras';
      end if;
    end if;
  end if;

  if new.sets_a is distinct from old.sets_a or new.sets_b is distinct from old.sets_b
     or new.score_detail is distinct from old.score_detail then
    select count(*) into players from friendly_players where match_id = new.id;
    if players < 4 then
      raise exception 'El amistoso no tuvo los 4 jugadores: no lleva resultado';
    end if;
    if auth.uid() is not null and not public.is_organizer() then
      if not public.in_friendly(new.id) then
        raise exception 'Solo los jugadores del amistoso pueden poner el resultado';
      end if;
      if madrid < new.play_at then
        raise exception 'El resultado se puede poner cuando haya pasado la fecha del partido';
      end if;
    end if;
    if new.sets_a is null then
      new.score_detail := null;
      new.result_by := null;
      new.result_at := null;
    else
      new.result_by := auth.uid();
      new.result_at := now();
    end if;
  elsif not syncing then
    new.result_by := old.result_by;
    new.result_at := old.result_at;
  end if;
  return new;
end
$$;

drop trigger if exists before_friendly_match on public.friendly_matches;
create trigger before_friendly_match
  before insert or update on public.friendly_matches
  for each row execute function public.check_friendly_match();

-- Quien crea el amistoso queda apuntado en el primer hueco.
create or replace function public.join_friendly_creator()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into friendly_players (match_id, profile_id, side, slot)
    values (new.id, new.created_by, 'a', 1)
    on conflict do nothing;
  end if;
  return new;
end
$$;

drop trigger if exists after_friendly_match on public.friendly_matches;
create trigger after_friendly_match
  after insert on public.friendly_matches
  for each row execute function public.join_friendly_creator();

-- 2. Reglas de los apuntados
create or replace function public.check_friendly_player()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m friendly_matches;
begin
  select * into m from friendly_matches where id = coalesce(new.match_id, old.match_id);
  -- Al borrar el partido se borran sus apuntados: no hay nada que comprobar.
  if not found then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and (new.match_id <> old.match_id or new.profile_id <> old.profile_id) then
    raise exception 'Eso no se puede cambiar';
  end if;
  if tg_op <> 'DELETE' then
    if exists (select 1 from profiles where id = new.profile_id and deleted_at is not null) then
      raise exception 'Ese jugador ya no existe';
    end if;
  end if;

  if auth.uid() is not null and not public.is_organizer() then
    if coalesce(new.profile_id, old.profile_id) <> auth.uid() then
      raise exception 'Cada jugador se apunta o se desapunta a sí mismo';
    end if;
    if (now() at time zone 'Europe/Madrid') >= m.play_at then
      raise exception 'El amistoso ya ha empezado: no se puede cambiar quién juega';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.joined_at := now();
  elsif tg_op = 'UPDATE' then
    new.joined_at := old.joined_at;
  end if;
  return coalesce(new, old);
end
$$;

drop trigger if exists before_friendly_player on public.friendly_players;
create trigger before_friendly_player
  before insert or update or delete on public.friendly_players
  for each row execute function public.check_friendly_player();

-- Si se va el creador, el partido pasa al siguiente apuntado; si no queda nadie, se borra.
create or replace function public.after_friendly_leave()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  next_one uuid;
begin
  if not exists (select 1 from friendly_matches where id = old.match_id) then
    return old;
  end if;
  select profile_id into next_one from friendly_players
    where match_id = old.match_id order by joined_at limit 1;
  if next_one is null then
    delete from friendly_matches where id = old.match_id;
  elsif exists (select 1 from friendly_matches where id = old.match_id and created_by = old.profile_id) then
    perform set_config('app.friendly_sync', 'on', true);
    update friendly_matches set created_by = next_one where id = old.match_id;
    perform set_config('app.friendly_sync', 'off', true);
  end if;
  return old;
end
$$;

drop trigger if exists after_friendly_player_delete on public.friendly_players;
create trigger after_friendly_player_delete
  after delete on public.friendly_players
  for each row execute function public.after_friendly_leave();

-- 3. Permisos
alter table public.friendly_matches enable row level security;
alter table public.friendly_players enable row level security;

drop policy if exists "Ver amistosos" on public.friendly_matches;
create policy "Ver amistosos" on public.friendly_matches for select to authenticated using (true);
drop policy if exists "Crear amistosos" on public.friendly_matches;
create policy "Crear amistosos" on public.friendly_matches for insert to authenticated
  with check (created_by = auth.uid() or public.is_organizer());
drop policy if exists "Cambiar amistosos" on public.friendly_matches;
create policy "Cambiar amistosos" on public.friendly_matches for update to authenticated
  using (created_by = auth.uid() or public.in_friendly(id) or public.is_organizer())
  with check (true);
drop policy if exists "Borrar amistosos" on public.friendly_matches;
create policy "Borrar amistosos" on public.friendly_matches for delete to authenticated
  using (public.is_organizer() or (created_by = auth.uid() and not public.friendly_started(id)));

drop policy if exists "Ver apuntados" on public.friendly_players;
create policy "Ver apuntados" on public.friendly_players for select to authenticated using (true);
drop policy if exists "Apuntarse" on public.friendly_players;
create policy "Apuntarse" on public.friendly_players for insert to authenticated
  with check (profile_id = auth.uid() or public.is_organizer());
drop policy if exists "Cambiar de hueco" on public.friendly_players;
create policy "Cambiar de hueco" on public.friendly_players for update to authenticated
  using (profile_id = auth.uid() or public.is_organizer())
  with check (profile_id = auth.uid() or public.is_organizer());
drop policy if exists "Desapuntarse" on public.friendly_players;
create policy "Desapuntarse" on public.friendly_players for delete to authenticated
  using (profile_id = auth.uid() or public.is_organizer());
