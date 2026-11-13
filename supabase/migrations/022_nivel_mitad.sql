-- Nivel a la mitad.
-- Ejecutar en Supabase > SQL Editor después de 021_nivel.sql.
--
--  * El formulario da la mitad que antes: (1,00 + 0,25 por punto) / 2, entre
--    1,00 y 3,25.
--  * Los niveles iniciales que ya salieron del formulario se recalculan con la
--    nueva fórmula. Los que un organizador cambió a mano no se tocan (solo se
--    recalculan los que coinciden con lo que daba la fórmula anterior).
--  * Lo que se gana o se pierde en cada partido lo calcula la web (ya va a la
--    mitad con la nueva versión), así que no hace falta nada más aquí.

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
  lvl := greatest(1, least(3.25, round((1 + 0.25 * points) * 0.5, 2)));

  insert into player_levels (profile_id, answers, initial_level, set_by, updated_at)
  values (target, answers, lvl, auth.uid(), now())
  on conflict (profile_id) do update
    set answers = excluded.answers, initial_level = excluded.initial_level,
        set_by = excluded.set_by, updated_at = now();
  return lvl;
end
$$;

-- Recalcular los que ya rellenaron el formulario (y nadie los cambió a mano).
update public.player_levels pl
set initial_level = greatest(1, least(3.25, round((1 + 0.25 * s.points) * 0.5, 2)))
from (
  select profile_id, (select coalesce(sum(a), 0) from unnest(answers) a) as points
  from public.player_levels
  where answers is not null
) s
where pl.profile_id = s.profile_id
  and pl.initial_level = least(6.5, 1 + 0.25 * s.points);
