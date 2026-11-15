-- Ligas y categorías (paso 4 de 7): el día a día por categoría.
-- Ejecutar en Supabase > SQL Editor después de 024_roles_y_seguridad.sql.
--
--  * "Categoría activa": la del jugador. Un organizador de liga (o el superadmin)
--    puede elegir otra de las que gestiona desde la pestaña Ligas; la web la
--    manda en cada consulta (cabecera x-categoria) y aquí se comprueba que
--    de verdad la gestiona.
--  * Temporada en curso, reinicio, parejas, encuestas, noticias y amistosos
--    nuevos van a la categoría activa.
--  * Las parejas fijas pasan a tener categoría (pairs.category_id).
--  * Vistas para las listas de la web: category_players, category_pairs y
--    category_seasons (jugadores, parejas y temporadas de la categoría activa).
-- Con una sola categoría no cambia nada. Se puede ejecutar más de una vez.

-- 1. Categoría activa
create or replace function public.active_category_id()
returns uuid
language plpgsql stable security definer set search_path = public
as $$
declare
  h text;
  c uuid;
begin
  begin
    h := current_setting('request.headers', true)::json ->> 'x-categoria';
  exception when others then
    h := null;
  end;
  if h ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    c := h::uuid;
    if public.manages_category(c) then
      return c;
    end if;
  end if;

  c := public.my_category_id();
  if c is not null then
    return c;
  end if;

  -- Organizador de liga sin categoría propia: la primera de su liga.
  select cat.id into c
    from competition_admins a join categories cat on cat.competition_id = a.competition_id
    where a.profile_id = auth.uid()
    order by cat.created_at, cat.id limit 1;
  return coalesce(c, public.default_category_id());
end
$$;

-- Para la cabecera de la web: categoría activa y su liga.
create or replace function public.active_category()
returns table (id uuid, name text, competition_id uuid, competition_name text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.name, c.competition_id, l.name
  from categories c join competitions l on l.id = c.competition_id
  where c.id = public.active_category_id()
$$;

revoke all on function public.active_category() from public, anon;
grant execute on function public.active_category() to authenticated;

-- 2. Organizador = gestiona la categoría activa (o es de liga / superadmin).
create or replace function public.is_organizer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.manages_category(public.active_category_id()) or public.is_any_league_admin()
$$;

-- 3. Temporada en curso y reinicio: los de la categoría activa.
create or replace function public.current_league_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from leagues where ended_at is null and category_id = public.active_category_id() limit 1
$$;

create or replace function public.start_new_league(new_name text, new_kind text default 'parejas')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  clean text := trim(new_name);
  cat uuid := public.active_category_id();
  nid uuid;
begin
  if not public.manages_category(cat) then
    raise exception 'Solo un organizador puede empezar una liga nueva';
  end if;
  if clean is null or clean = '' then
    raise exception 'Ponle un nombre a la nueva liga';
  end if;
  if new_kind not in ('parejas', 'individual') then
    raise exception 'Elige si la liga es por parejas o individual';
  end if;
  update leagues set ended_at = now() where ended_at is null and category_id = cat;
  insert into leagues (name, kind, category_id) values (clean, new_kind, cat) returning id into nid;
  return nid;
end
$$;

-- Al crear una temporada sin categoría: la activa.
create or replace function public.set_league_category()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.category_id is null then
    new.category_id := public.active_category_id();
  end if;
  return new;
end
$$;

-- 4. Parejas con categoría
alter table public.pairs add column if not exists category_id uuid references public.categories(id) on delete cascade;
update public.pairs x set category_id = l.category_id
  from public.leagues l where x.league_id = l.id and x.category_id is null;
update public.pairs x set category_id = (
    select p.category_id from public.profiles p
    where p.pair_id = x.id and p.category_id is not null order by p.id limit 1)
  where x.category_id is null;
update public.pairs set category_id = public.default_category_id() where category_id is null;
alter table public.pairs alter column category_id set default public.active_category_id();
alter table public.pairs alter column category_id set not null;
create index if not exists pairs_category_idx on public.pairs (category_id);

-- El nombre de una pareja fija es único dentro de su categoría (antes, en toda la web).
drop index if exists public.pairs_name_fixed;
create unique index if not exists pairs_name_fixed_per_category on public.pairs (category_id, name) where league_id is null;

-- Pareja fija: solo jugadores de su categoría.
create or replace function public.check_profile_pair_fixed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.pair_id is not null and new.pair_id is distinct from old.pair_id then
    if exists (select 1 from pairs where id = new.pair_id and league_id is not null) then
      raise exception 'Esa pareja es de una liga individual';
    end if;
    if exists (select 1 from pairs where id = new.pair_id and category_id is distinct from new.category_id) then
      raise exception 'Esa pareja es de otra categoría';
    end if;
  end if;
  return new;
end
$$;

create or replace function public.pair_category(p uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select category_id from pairs where id = p $$;

-- Pareja de liga individual: en la categoría de su temporada.
create or replace function public.set_pair_category()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.league_id is not null then
    new.category_id := (select category_id from leagues where id = new.league_id);
  end if;
  return new;
end
$$;

drop trigger if exists before_pair_category on public.pairs;
create trigger before_pair_category
  before insert or update of league_id on public.pairs
  for each row execute function public.set_pair_category();

-- Permisos de parejas: ahora con su columna de categoría.
drop policy if exists "Solo mi liga (ver)" on public.pairs;
create policy "Solo mi liga (ver)" on public.pairs as restrictive for select to authenticated
  using (public.sees_category(category_id));
drop policy if exists "Solo mi categoría (crear)" on public.pairs;
create policy "Solo mi categoría (crear)" on public.pairs as restrictive for insert to authenticated
  with check (public.touches_category(category_id));
drop policy if exists "Solo mi categoría (cambiar)" on public.pairs;
create policy "Solo mi categoría (cambiar)" on public.pairs as restrictive for update to authenticated
  using (public.touches_category(category_id)) with check (public.touches_category(category_id));
drop policy if exists "Solo mi categoría (borrar)" on public.pairs;
create policy "Solo mi categoría (borrar)" on public.pairs as restrictive for delete to authenticated
  using (public.touches_category(category_id));

-- 5. Lo nuevo va a la categoría activa
alter table public.polls alter column category_id set default public.active_category_id();
alter table public.news_items alter column category_id set default public.active_category_id();
alter table public.friendly_matches alter column competition_id
  set default public.category_competition(public.active_category_id());

-- 6. Listas de la categoría activa (con los permisos de quien consulta)
create or replace view public.category_players with (security_invoker = true) as
  select * from public.profiles where category_id = public.active_category_id();

create or replace view public.category_pairs with (security_invoker = true) as
  select * from public.pairs where category_id = public.active_category_id();

create or replace view public.category_seasons with (security_invoker = true) as
  select * from public.leagues where category_id = public.active_category_id();

grant select on public.category_players, public.category_pairs, public.category_seasons to authenticated;

-- 7. Comprobación
select
  (select count(*) from public.pairs where category_id is null) as parejas_sin_categoria,
  (select count(*) from public.pairs) as parejas,
  (select count(*) from public.category_seasons) as temporadas_vistas_desde_aqui;
