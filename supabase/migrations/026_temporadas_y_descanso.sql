-- Ligas y categorías (paso 5 de 7): fin de temporada, descanso y cambio de categoría.
-- Ejecutar en Supabase > SQL Editor después de 025_categoria_activa.sql.
--
--  * Fin de temporada (lo que antes era reiniciar): se cierra la temporada y se
--    deja preparada la siguiente con su fecha de inicio (started_at en el futuro).
--  * Descanso: la temporada nueva todavía no ha empezado. No se pueden crear
--    partidos. Empieza sola cuando llega su fecha (no hay que pulsar nada).
--  * Durante el descanso se puede cambiar el nombre, el tipo y la fecha de
--    inicio de la temporada que viene.
--  * Cambio de categoría: solo el organizador de liga (paso 2) y solo cuando la
--    categoría de ORIGEN está en descanso. Si la de destino está jugando, entra
--    como un jugador nuevo.
-- Con una temporada en curso no cambia nada. Se puede ejecutar más de una vez.

-- 1. ¿Está en descanso esa categoría? (su temporada abierta aún no ha empezado)
create or replace function public.category_resting(cat uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from leagues where category_id = cat and ended_at is null and started_at > now())
$$;

-- ¿Está jugando? (tiene una temporada en curso ya empezada)
create or replace function public.category_playing(cat uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from leagues where category_id = cat and ended_at is null and started_at <= now())
$$;

-- 2. Fin de temporada: cierra la de la categoría activa y prepara la siguiente.
--    Sin fecha (o con la de hoy), la nueva empieza ya, como antes.
drop function if exists public.start_new_league(text, text);

create or replace function public.start_new_league(new_name text, new_kind text default 'parejas', new_start date default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  clean text := trim(new_name);
  cat uuid := public.active_category_id();
  today date := (now() at time zone 'Europe/Madrid')::date;
  starts timestamptz;
  nid uuid;
begin
  if not public.manages_category(cat) then
    raise exception 'Solo un organizador puede terminar la temporada';
  end if;
  if clean is null or clean = '' then
    raise exception 'Ponle un nombre a la nueva temporada';
  end if;
  if new_kind not in ('parejas', 'individual') then
    raise exception 'Elige si la temporada es por parejas o individual';
  end if;
  if new_start is not null and new_start < today then
    raise exception 'La fecha de inicio no puede ser anterior a hoy';
  end if;
  if public.category_resting(cat) then
    raise exception 'La temporada ya está terminada: la siguiente todavía no ha empezado';
  end if;

  starts := case
    when new_start is null or new_start = today then now()
    else (new_start::timestamp at time zone 'Europe/Madrid')
  end;
  update leagues set ended_at = now() where ended_at is null and category_id = cat;
  insert into leagues (name, kind, category_id, started_at)
    values (clean, new_kind, cat, starts) returning id into nid;
  return nid;
end
$$;

revoke all on function public.start_new_league(text, text, date) from public, anon;
grant execute on function public.start_new_league(text, text, date) to authenticated;

-- 3. Cambiar la temporada que viene (durante el descanso)
create or replace function public.update_next_season(season uuid, new_name text, new_kind text, new_start date)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s leagues;
  today date := (now() at time zone 'Europe/Madrid')::date;
begin
  select * into s from leagues where id = season;
  if s.id is null or not public.manages_category(s.category_id) then
    raise exception 'Solo un organizador puede cambiar la temporada';
  end if;
  if s.ended_at is not null or s.started_at <= now() then
    raise exception 'Esa temporada ya ha empezado';
  end if;
  if trim(coalesce(new_name, '')) = '' then
    raise exception 'Ponle un nombre a la temporada';
  end if;
  if new_kind not in ('parejas', 'individual') then
    raise exception 'Elige si la temporada es por parejas o individual';
  end if;
  if new_start is null or new_start < today then
    raise exception 'La fecha de inicio no puede ser anterior a hoy';
  end if;
  update leagues
     set name = trim(new_name),
         kind = new_kind,
         started_at = case when new_start = today then now()
                           else (new_start::timestamp at time zone 'Europe/Madrid') end
   where id = season;
end
$$;

revoke all on function public.update_next_season(uuid, text, text, date) from public, anon;
grant execute on function public.update_next_season(uuid, text, text, date) to authenticated;

-- El tipo y la fecha de inicio de una temporada ya empezada no se tocan
-- (el nombre sí). Desde el SQL Editor (sin usuario) se puede todo.
create or replace function public.check_league_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and old.started_at <= now()
     and (new.kind is distinct from old.kind or new.started_at is distinct from old.started_at
          or new.category_id is distinct from old.category_id) then
    raise exception 'Esa temporada ya ha empezado: solo se puede cambiar el nombre';
  end if;
  return new;
end
$$;

drop trigger if exists before_league_update on public.leagues;
create trigger before_league_update
  before update on public.leagues
  for each row execute function public.check_league_update();

-- 4. Sin partidos en una temporada que aún no ha empezado.
--    (Se llama "zz_" para ejecutarse después de check_match, que pone la temporada.)
create or replace function public.check_match_season_started()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status <> 'cancelado' and exists (
    select 1 from leagues where id = new.league_id and started_at > now()
  ) then
    raise exception 'La temporada todavía no ha empezado: en el descanso no hay partidos';
  end if;
  return new;
end
$$;

drop trigger if exists zz_before_match_season on public.matches;
create trigger zz_before_match_season
  before insert on public.matches
  for each row execute function public.check_match_season_started();

-- 5. Cambio de categoría: solo con la categoría de origen en descanso.
--    Desde el SQL Editor (sin usuario) se puede siempre.
create or replace function public.check_profile_category_rest()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.category_id is distinct from old.category_id
     and old.category_id is not null
     and public.category_playing(old.category_id) then
    raise exception 'Solo se puede cambiar de categoría cuando la suya está en el descanso entre temporadas';
  end if;
  return new;
end
$$;

drop trigger if exists before_profile_category_rest on public.profiles;
create trigger before_profile_category_rest
  before update of category_id on public.profiles
  for each row execute function public.check_profile_category_rest();

-- 6. Comprobación: estado de cada categoría.
select c.name as categoria,
       case when public.category_resting(c.id) then 'descanso'
            when public.category_playing(c.id) then 'jugando'
            else 'sin temporada' end as estado
from public.categories c order by c.created_at;
