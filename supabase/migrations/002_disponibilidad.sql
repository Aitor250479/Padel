-- Paso 2: disponibilidad semanal.
-- Ejecutar en Supabase > SQL Editor después de 001_base.sql.

-- Franjas en las que una pareja puede empezar a jugar (día + hora de inicio).
create table public.availability (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  day date not null,
  hour smallint not null check (hour between 0 and 23),
  primary key (pair_id, day, hour)
);

-- Semanas que una pareja ya ha rellenado (aunque sea para decir que no puede jugar).
create table public.availability_weeks (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  updated_at timestamptz not null default now(),
  primary key (pair_id, week_start)
);

create or replace function public.my_pair_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select pair_id from profiles where id = auth.uid()
$$;

alter table public.availability enable row level security;
alter table public.availability_weeks enable row level security;

create policy "Ver disponibilidad" on public.availability
  for select to authenticated using (true);
create policy "Mi pareja edita su disponibilidad" on public.availability
  for all to authenticated
  using (pair_id = public.my_pair_id() or public.is_organizer())
  with check (pair_id = public.my_pair_id() or public.is_organizer());

create policy "Ver semanas rellenadas" on public.availability_weeks
  for select to authenticated using (true);
create policy "Mi pareja marca su semana" on public.availability_weeks
  for all to authenticated
  using (pair_id = public.my_pair_id() or public.is_organizer())
  with check (pair_id = public.my_pair_id() or public.is_organizer());
