-- Encuestas en la pantalla de inicio.
-- Ejecutar en Supabase > SQL Editor después de 014_liga_individual.sql.
--
--  * El organizador crea una encuesta con su pregunta, sus opciones y hasta
--    qué día y hora está abierta (hora de Madrid).
--  * Cada jugador vota una vez y puede cambiar su voto mientras está abierta.
--  * Nadie ve los votos de los demás hasta que se cierra; entonces todos ven
--    el resultado.
--  * La encuesta que se muestra en el inicio se guarda en site_texts
--    ('encuesta_actual') y el modo del inicio pasa a poder ser 'encuesta'.

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(trim(question)) > 0),
  -- Hora local de Madrid, como la reserva de los partidos.
  closes_at timestamp not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  position smallint not null,
  label text not null check (length(trim(label)) > 0),
  unique (poll_id, position)
);

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  option_id uuid not null references public.poll_options(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (poll_id, profile_id)
);

-- ¿Sigue abierta la encuesta?
create or replace function public.poll_open(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select (now() at time zone 'Europe/Madrid') < closes_at from polls where id = p), false)
$$;

-- El voto tiene que ser una opción de esa encuesta, y la encuesta estar abierta.
create or replace function public.check_poll_vote()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from poll_options where id = new.option_id and poll_id = new.poll_id) then
    raise exception 'Esa respuesta no es de esta encuesta';
  end if;
  if not public.poll_open(new.poll_id) then
    raise exception 'La encuesta ya está cerrada';
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists before_poll_vote on public.poll_votes;
create trigger before_poll_vote
  before insert or update on public.poll_votes
  for each row execute function public.check_poll_vote();

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists "Ver encuestas" on public.polls;
create policy "Ver encuestas" on public.polls for select to authenticated using (true);
drop policy if exists "Organizadores gestionan encuestas" on public.polls;
create policy "Organizadores gestionan encuestas" on public.polls
  for all to authenticated using (public.is_organizer()) with check (public.is_organizer());

drop policy if exists "Ver opciones" on public.poll_options;
create policy "Ver opciones" on public.poll_options for select to authenticated using (true);
drop policy if exists "Organizadores gestionan opciones" on public.poll_options;
create policy "Organizadores gestionan opciones" on public.poll_options
  for all to authenticated using (public.is_organizer()) with check (public.is_organizer());

-- Mi voto siempre; los de los demás, solo cuando la encuesta está cerrada.
drop policy if exists "Ver votos" on public.poll_votes;
create policy "Ver votos" on public.poll_votes for select to authenticated
  using (profile_id = auth.uid() or not public.poll_open(poll_id));
drop policy if exists "Votar" on public.poll_votes;
create policy "Votar" on public.poll_votes for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists "Cambiar mi voto" on public.poll_votes;
create policy "Cambiar mi voto" on public.poll_votes for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Crear una encuesta con sus opciones de una vez y ponerla en el inicio.
create or replace function public.create_poll(p_question text, p_options text[], p_closes_at timestamp)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  pid uuid;
  clean text[];
begin
  if not public.is_organizer() then
    raise exception 'Solo un organizador puede crear encuestas';
  end if;
  select coalesce(array_agg(trim(o) order by n), '{}') into clean
    from unnest(p_options) with ordinality as x(o, n) where trim(o) <> '';
  if trim(coalesce(p_question, '')) = '' then
    raise exception 'Escribe la pregunta de la encuesta';
  end if;
  if cardinality(clean) < 2 then
    raise exception 'La encuesta necesita al menos 2 respuestas';
  end if;
  if p_closes_at is null or p_closes_at <= (now() at time zone 'Europe/Madrid') then
    raise exception 'La fecha y hora de cierre tiene que ser futura';
  end if;
  insert into polls (question, closes_at) values (trim(p_question), p_closes_at) returning id into pid;
  insert into poll_options (poll_id, position, label)
    select pid, n, o from unnest(clean) with ordinality as x(o, n);
  insert into site_texts (key, body, updated_by) values ('encuesta_actual', pid::text, auth.uid())
    on conflict (key) do update set body = excluded.body, updated_at = now(), updated_by = excluded.updated_by;
  insert into site_texts (key, body, updated_by) values ('inicio_modo', 'encuesta', auth.uid())
    on conflict (key) do update set body = excluded.body, updated_at = now(), updated_by = excluded.updated_by;
  return pid;
end
$$;

revoke all on function public.create_poll(text, text[], timestamp) from public;
grant execute on function public.create_poll(text, text[], timestamp) to authenticated;
