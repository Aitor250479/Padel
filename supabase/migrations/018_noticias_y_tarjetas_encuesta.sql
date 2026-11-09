-- Tarjetas de encuesta en el inicio y sección de Noticias.
-- Ejecutar en Supabase > SQL Editor después de 017_recuento_encuesta.sql.
--
--  * Cada encuesta guarda cuántas horas se enseña su resultado en el inicio
--    después de cerrarse (48 por defecto).
--  * El inicio ya no tiene el modo "encuesta": las encuestas salen como
--    tarjetas. Si estaba en ese modo pasa a mostrar el texto de bienvenida.
--  * Noticias escritas por los organizadores (máximo 150 caracteres), que se
--    muestran o no en el inicio una a una.

alter table public.polls
  add column if not exists result_hours int not null default 48
  check (result_hours between 1 and 720);

update public.site_texts set body = 'texto' where key = 'inicio_modo' and body = 'encuesta';

-- Crear una encuesta con sus opciones de una vez (ya no cambia el modo del inicio).
drop function if exists public.create_poll(text, text[], timestamp);
create or replace function public.create_poll(
  p_question text,
  p_options text[],
  p_closes_at timestamp,
  p_result_hours int default 48
)
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
  if p_result_hours is null or p_result_hours < 1 or p_result_hours > 720 then
    raise exception 'El tiempo para mostrar el resultado no es válido';
  end if;
  insert into polls (question, closes_at, result_hours)
    values (trim(p_question), p_closes_at, p_result_hours) returning id into pid;
  insert into poll_options (poll_id, position, label)
    select pid, n, o from unnest(clean) with ordinality as x(o, n);
  return pid;
end
$$;

revoke all on function public.create_poll(text, text[], timestamp, int) from public;
grant execute on function public.create_poll(text, text[], timestamp, int) to authenticated;

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(trim(body)) > 0 and length(body) <= 150),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid()
);

alter table public.news_items enable row level security;

drop policy if exists "Ver noticias" on public.news_items;
create policy "Ver noticias" on public.news_items for select to authenticated using (true);
drop policy if exists "Organizadores gestionan noticias" on public.news_items;
create policy "Organizadores gestionan noticias" on public.news_items
  for all to authenticated using (public.is_organizer()) with check (public.is_organizer());
