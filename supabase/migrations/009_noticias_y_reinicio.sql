-- 1. Fecha en la que se confirma el resultado de un partido (para "Últimas noticias").
alter table public.matches add column if not exists result_at timestamptz;

update public.matches set result_at = coalesce(result_at, created_at)
  where sets_a is not null;

create or replace function public.set_match_result_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.sets_a is distinct from old.sets_a
     or new.sets_b is distinct from old.sets_b then
    new.result_at := case when new.sets_a is null then null else now() end;
  end if;
  return new;
end
$$;

drop trigger if exists before_match_result_at on public.matches;
create trigger before_match_result_at
  before insert or update on public.matches
  for each row execute function public.set_match_result_at();

-- 2. Reiniciar la liga: borra todos los partidos y sus resultados.
--    Las parejas, los jugadores y la disponibilidad se mantienen.
create or replace function public.reset_league()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  n integer;
begin
  if not public.is_organizer() then
    raise exception 'Solo un organizador puede reiniciar la liga';
  end if;
  delete from match_results where true;
  delete from matches where true;
  get diagnostics n = row_count;
  return n;
end
$$;

revoke all on function public.reset_league() from public, anon;
grant execute on function public.reset_league() to authenticated;
