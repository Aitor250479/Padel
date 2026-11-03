-- Cambios (noviembre 2026):
--  * La disponibilidad pasa a ser un sí/no por jugador y semana.
--  * El resultado lo introduce cada pareja y cuenta cuando las dos coinciden.
-- Ejecutar en Supabase > SQL Editor después de 004_resultados.sql.
-- Las tablas antiguas de franjas (availability, availability_weeks) se dejan, ya no se usan.

-- 1. Disponibilidad por jugador
create table public.player_availability (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  can_play boolean not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, week_start)
);

alter table public.player_availability enable row level security;

create policy "Ver disponibilidad de jugadores" on public.player_availability
  for select to authenticated using (true);
create policy "Cada jugador marca la suya" on public.player_availability
  for all to authenticated
  using (profile_id = auth.uid() or public.is_organizer())
  with check (profile_id = auth.uid() or public.is_organizer());

-- 2. Resultado propuesto por cada pareja
create table public.match_results (
  match_id uuid not null references public.matches(id) on delete cascade,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  sets_a smallint not null,
  sets_b smallint not null,
  score_detail text,
  entered_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (match_id, pair_id),
  check ((sets_a, sets_b) in ((2, 0), (2, 1), (1, 1), (1, 2), (0, 2)))
);

alter table public.match_results enable row level security;

create policy "Ver resultados propuestos" on public.match_results
  for select to authenticated using (true);
create policy "Cada pareja propone su resultado" on public.match_results
  for all to authenticated
  using (pair_id = public.my_pair_id() or public.is_organizer())
  with check (pair_id = public.my_pair_id() or public.is_organizer());

-- La pareja tiene que jugar ese partido y el partido no puede estar cancelado.
create or replace function public.check_match_result()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m matches;
begin
  select * into m from matches where id = new.match_id;
  if new.pair_id not in (m.pair_a, m.pair_b) then
    raise exception 'Esa pareja no juega este partido';
  end if;
  if m.status = 'cancelado' then
    raise exception 'El partido está cancelado';
  end if;
  new.updated_at := now();
  if auth.uid() is not null then
    new.entered_by := auth.uid();
  end if;
  return new;
end
$$;

create trigger before_match_result_write
  before insert or update on public.match_results
  for each row execute function public.check_match_result();

-- Cuando las dos parejas coinciden, el resultado pasa al partido (y a la clasificación).
-- Si no coinciden o falta una, el partido queda sin resultado.
create or replace function public.sync_match_result()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  mid uuid := coalesce(new.match_id, old.match_id);
  n int;
  a smallint;
  b smallint;
  detail text;
  distinct_results int;
begin
  select count(*), count(distinct (sets_a, sets_b)), min(sets_a), min(sets_b),
         max(score_detail)
    into n, distinct_results, a, b, detail
    from match_results where match_id = mid;

  perform set_config('app.sync_result', 'on', true);
  if n = 2 and distinct_results = 1 then
    update matches set sets_a = a, sets_b = b, score_detail = detail where id = mid;
  else
    update matches set sets_a = null, sets_b = null, score_detail = null
      where id = mid and sets_a is not null;
  end if;
  perform set_config('app.sync_result', 'off', true);
  return null;
end
$$;

create trigger after_match_result_write
  after insert or update or delete on public.match_results
  for each row execute function public.sync_match_result();

-- 3. Los jugadores ya no escriben el resultado directamente en el partido.
create or replace function public.check_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
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
      and (m.pair_a in (new.pair_a, new.pair_b) or m.pair_b in (new.pair_a, new.pair_b))
  ) then
    raise exception 'Una de las parejas ya tiene partido esa semana';
  end if;

  return new;
end
$$;

-- Los resultados ya introducidos a mano en partidos pasan a contar como confirmados.
insert into public.match_results (match_id, pair_id, sets_a, sets_b, score_detail)
select id, pair_a, sets_a, sets_b, score_detail from public.matches where sets_a is not null
union all
select id, pair_b, sets_a, sets_b, score_detail from public.matches where sets_a is not null
on conflict do nothing;
