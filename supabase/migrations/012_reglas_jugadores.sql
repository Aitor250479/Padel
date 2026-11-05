-- Reglas que antes solo comprobaba la web y ahora también la base de datos.
-- Ejecutar en Supabase > SQL Editor después de 011_estadisticas.sql.
--
--  * Un jugador solo puede poner su resultado cuando ya ha pasado la fecha y
--    hora del partido (o, sin fecha apuntada, cuando ha terminado la semana).
--  * Un jugador no puede tocar resultados de una liga ya cerrada.
--  * Un jugador no puede cambiar a mano la fecha del resultado ("Últimas
--    noticias"), quién lo puso ni la fecha de creación del partido.
-- Los organizadores pueden hacer todo lo anterior, como hasta ahora.

-- 1. Resultados propuestos por cada pareja
create or replace function public.check_match_result()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m matches;
  madrid timestamp := now() at time zone 'Europe/Madrid';
begin
  select * into m from matches where id = new.match_id;
  if new.pair_id not in (m.pair_a, m.pair_b) then
    raise exception 'Esa pareja no juega este partido';
  end if;
  if m.status = 'cancelado' then
    raise exception 'El partido está cancelado';
  end if;

  if auth.uid() is not null and not public.is_organizer() then
    if m.league_id is distinct from public.current_league_id() then
      raise exception 'Ese partido es de una liga ya cerrada';
    end if;
    if (m.booking_at is not null and madrid < m.booking_at)
       or (m.booking_at is null and madrid::date < m.week_start + 7) then
      raise exception 'El resultado se puede poner cuando haya pasado la fecha del partido';
    end if;
  end if;

  new.updated_at := now();
  if auth.uid() is not null then
    new.entered_by := auth.uid();
  end if;
  return new;
end
$$;

-- 2. Partidos: igual que en 010_ligas.sql, más los campos protegidos.
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
    -- Campos que solo cambia la propia base de datos.
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

  return new;
end
$$;
