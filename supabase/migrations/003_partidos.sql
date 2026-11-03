-- Paso 3: emparejamientos (partidos).
-- Ejecutar en Supabase > SQL Editor después de 002_disponibilidad.sql.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null check (extract(isodow from week_start) = 1),
  pair_a uuid not null references public.pairs(id) on delete cascade,
  pair_b uuid not null references public.pairs(id) on delete cascade,
  -- Franja en la que coinciden (propuesta al emparejar).
  slot_day date,
  slot_hour smallint check (slot_hour between 0 and 23),
  -- Reserva de pista, la rellenan los jugadores.
  booking_place text,
  booking_at timestamp,
  status text not null default 'programado'
    check (status in ('programado', 'jugado', 'cancelado')),
  created_at timestamptz not null default now(),
  check (pair_a <> pair_b)
);

create index matches_week_idx on public.matches (week_start);

create or replace function public.check_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Los jugadores solo pueden cambiar la reserva de pista.
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_organizer() then
    if new.week_start is distinct from old.week_start
       or new.pair_a is distinct from old.pair_a
       or new.pair_b is distinct from old.pair_b
       or new.slot_day is distinct from old.slot_day
       or new.slot_hour is distinct from old.slot_hour
       or new.status is distinct from old.status then
      raise exception 'Solo un organizador puede cambiar el emparejamiento';
    end if;
  end if;

  -- Un partido por pareja y semana.
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

create trigger before_match_write
  before insert or update on public.matches
  for each row execute function public.check_match();

alter table public.matches enable row level security;

create policy "Ver partidos" on public.matches
  for select to authenticated using (true);
create policy "Organizadores crean partidos" on public.matches
  for insert to authenticated with check (public.is_organizer());
create policy "Organizadores borran partidos" on public.matches
  for delete to authenticated using (public.is_organizer());
create policy "Jugadores del partido y organizadores lo editan" on public.matches
  for update to authenticated
  using (public.is_organizer() or public.my_pair_id() in (pair_a, pair_b))
  with check (public.is_organizer() or public.my_pair_id() in (pair_a, pair_b));
