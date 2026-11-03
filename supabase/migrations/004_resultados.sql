-- Paso 4: resultados y clasificación.
-- Ejecutar en Supabase > SQL Editor después de 003_partidos.sql.
--
-- El resultado se guarda en sets ganados por cada pareja (mejor de 3).
-- Cada set ganado es 1 punto: 2-0, 2-1, 1-1 (partido sin terminar, empate), 1-2, 0-2.
-- Si un partido no se termina y las parejas acuerdan un ganador, ponen 2-1 o 2-0.

alter table public.matches
  add column sets_a smallint,
  add column sets_b smallint,
  add column score_detail text,
  add column result_by uuid references public.profiles(id) on delete set null,
  add constraint matches_result_valid check (
    (sets_a is null and sets_b is null)
    or (sets_a, sets_b) in ((2, 0), (2, 1), (1, 1), (1, 2), (0, 2))
  );

create or replace function public.check_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- El estado "jugado" depende de que haya resultado.
  if new.status <> 'cancelado' then
    new.status := case when new.sets_a is not null then 'jugado' else 'programado' end;
  end if;

  if tg_op = 'UPDATE' and new.sets_a is distinct from old.sets_a
     or tg_op = 'UPDATE' and new.sets_b is distinct from old.sets_b then
    new.result_by := auth.uid();
  end if;

  -- Los jugadores solo pueden cambiar la reserva de pista y el resultado.
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_organizer() then
    if new.week_start is distinct from old.week_start
       or new.pair_a is distinct from old.pair_a
       or new.pair_b is distinct from old.pair_b
       or new.slot_day is distinct from old.slot_day
       or new.slot_hour is distinct from old.slot_hour
       or (new.status = 'cancelado') is distinct from (old.status = 'cancelado') then
      raise exception 'Solo un organizador puede cambiar el emparejamiento';
    end if;
    if old.status = 'cancelado' and (new.sets_a is distinct from old.sets_a
                                     or new.sets_b is distinct from old.sets_b) then
      raise exception 'El partido está cancelado';
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
