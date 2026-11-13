-- Nivel de los jugadores (de 1,00 a 10).
-- Ejecutar en Supabase > SQL Editor después de 020_amistosos.sql.
--
--  * Aquí solo se guarda el NIVEL INICIAL de cada jugador y las respuestas del
--    formulario. El nivel actual lo calcula la web con todos los partidos
--    oficiales confirmados, así que si se corrige un resultado, el nivel se
--    corrige solo.
--  * Cada jugador rellena su formulario una vez. Nivel inicial = 1,00 + 0,25
--    por punto, con un tope de 6,50.
--  * Los organizadores pueden rellenarlo por cualquier jugador, repetirlo o
--    poner el nivel inicial a mano (de 1,00 a 10).
--  * Todo el mundo puede ver los niveles.

create table if not exists public.player_levels (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- Respuesta de cada pregunta (0, 1, 2...). Vacío si un organizador puso el nivel a mano.
  answers smallint[],
  initial_level numeric(4, 2) not null check (initial_level between 1 and 10),
  set_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.player_levels enable row level security;
drop policy if exists "Ver niveles" on public.player_levels;
create policy "Ver niveles" on public.player_levels for select to authenticated using (true);
-- No hay políticas de escritura: se guarda con las dos funciones de abajo.

-- Guardar el formulario. Devuelve el nivel inicial que sale.
create or replace function public.save_level_form(target uuid, answers smallint[])
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  -- Respuesta más alta de cada pregunta, en el mismo orden que la web.
  max_answer smallint[] := array[3, 3, 2, 3, 3, 3, 3, 3];
  organizer boolean := public.is_organizer();
  points int := 0;
  lvl numeric(4, 2);
begin
  if auth.uid() is null then
    raise exception 'Tienes que entrar con tu usuario.';
  end if;
  if target <> auth.uid() and not organizer then
    raise exception 'Solo puedes rellenar tu propio formulario.';
  end if;
  if not exists (select 1 from profiles where id = target) then
    raise exception 'Ese jugador no existe.';
  end if;
  if not organizer and exists (select 1 from player_levels where profile_id = target) then
    raise exception 'Ya has rellenado el formulario. Si crees que tu nivel inicial no es el bueno, habla con un organizador.';
  end if;
  if answers is null or coalesce(array_length(answers, 1), 0) <> array_length(max_answer, 1) then
    raise exception 'Contesta todas las preguntas.';
  end if;
  for i in 1 .. array_length(max_answer, 1) loop
    if answers[i] is null or answers[i] < 0 or answers[i] > max_answer[i] then
      raise exception 'Contesta todas las preguntas.';
    end if;
    points := points + answers[i];
  end loop;
  lvl := least(6.5, 1 + 0.25 * points);

  insert into player_levels (profile_id, answers, initial_level, set_by, updated_at)
  values (target, answers, lvl, auth.uid(), now())
  on conflict (profile_id) do update
    set answers = excluded.answers, initial_level = excluded.initial_level,
        set_by = excluded.set_by, updated_at = now();
  return lvl;
end
$$;

-- Organizadores: poner el nivel inicial a mano.
create or replace function public.set_initial_level(target uuid, level numeric)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_organizer() then
    raise exception 'Solo un organizador puede cambiar el nivel inicial.';
  end if;
  if level is null or level < 1 or level > 10 then
    raise exception 'El nivel inicial tiene que estar entre 1,00 y 10.';
  end if;
  if not exists (select 1 from profiles where id = target) then
    raise exception 'Ese jugador no existe.';
  end if;
  insert into player_levels (profile_id, answers, initial_level, set_by, updated_at)
  values (target, null, round(level, 2), auth.uid(), now())
  on conflict (profile_id) do update
    set initial_level = excluded.initial_level, set_by = excluded.set_by, updated_at = now();
end
$$;

revoke all on function public.save_level_form(uuid, smallint[]) from public, anon;
grant execute on function public.save_level_form(uuid, smallint[]) to authenticated;
revoke all on function public.set_initial_level(uuid, numeric) from public, anon;
grant execute on function public.set_initial_level(uuid, numeric) to authenticated;
