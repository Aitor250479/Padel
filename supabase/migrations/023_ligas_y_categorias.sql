-- Ligas y categorías (paso 1 de 7): base y migración de los datos actuales.
-- Ejecutar en Supabase > SQL Editor después de 022_nivel_mitad.sql.
-- ANTES, ejecutar sql/copia_seguridad.sql (copia de todas las tablas).
--
-- Estructura nueva:  Liga (competitions) > Categoría (categories) > Temporada.
--  * La tabla "leagues" de siempre pasa a significar TEMPORADA: cada vez que se
--    reinicia se crea una temporada nueva dentro de su categoría.
--  * Todo lo que existe hoy pasa a la liga "Torneo Pádel Loyola", categoría
--    "Principal" (el nombre se podrá cambiar en el paso 3).
--  * Cada jugador tiene una categoría (profiles.category_id). Vacía = pendiente
--    de categoría (se usará en el paso 7).
--  * Superadmin: puede crear ligas y categorías. Se le da al organizador más
--    antiguo; al final se muestra quién es para comprobarlo.
--
-- Para los jugadores no cambia nada: de momento solo hay una categoría y la web
-- sigue funcionando igual. Se puede ejecutar más de una vez sin duplicar nada.

-- 1. Ligas y categorías
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (trim(name) <> ''),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete restrict,
  name text not null check (trim(name) <> ''),
  created_at timestamptz not null default now(),
  unique (competition_id, name)
);

-- 2. La liga y la categoría de los datos actuales
do $$
declare
  comp uuid;
begin
  if not exists (select 1 from public.categories) then
    insert into public.competitions (name) values ('Torneo Pádel Loyola') returning id into comp;
    insert into public.categories (competition_id, name) values (comp, 'Principal');
  end if;
end
$$;

-- Categoría por defecto mientras solo haya una (la más antigua).
create or replace function public.default_category_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select id from categories order by created_at, id limit 1 $$;

-- 3. Superadmin
alter table public.profiles add column if not exists is_superadmin boolean not null default false;

create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_superadmin and active from profiles where id = auth.uid()), false)
$$;

update public.profiles set is_superadmin = true
where not exists (select 1 from public.profiles where is_superadmin)
  and id = (
    select id from public.profiles
    where is_organizer and active and deleted_at is null
    order by created_at, id limit 1
  );

-- 4. Temporadas: cada una pertenece a una categoría
alter table public.leagues add column if not exists category_id uuid references public.categories(id) on delete restrict;
update public.leagues set category_id = public.default_category_id() where category_id is null;
alter table public.leagues alter column category_id set not null;
create index if not exists leagues_category_idx on public.leagues (category_id);

-- Una temporada en curso por categoría (antes: una para toda la web).
drop index if exists public.leagues_one_current;
create unique index if not exists leagues_one_current_per_category on public.leagues (category_id) where ended_at is null;

-- Al reiniciar, la temporada nueva se queda en la categoría de la anterior.
create or replace function public.set_league_category()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.category_id is null then
    new.category_id := coalesce(
      (select category_id from leagues order by started_at desc, id limit 1),
      public.default_category_id()
    );
  end if;
  return new;
end
$$;

drop trigger if exists before_league_category on public.leagues;
create trigger before_league_category
  before insert on public.leagues
  for each row execute function public.set_league_category();

-- 5. Jugadores: su categoría (los nuevos entran en la única que hay de momento)
alter table public.profiles add column if not exists category_id uuid references public.categories(id) on delete set null;
update public.profiles set category_id = public.default_category_id() where category_id is null;
alter table public.profiles alter column category_id set default public.default_category_id();
create index if not exists profiles_category_idx on public.profiles (category_id);

-- 6. Encuestas y noticias son de cada categoría; los amistosos, de cada liga
alter table public.polls add column if not exists category_id uuid references public.categories(id) on delete cascade;
update public.polls set category_id = public.default_category_id() where category_id is null;
alter table public.polls alter column category_id set default public.default_category_id();
alter table public.polls alter column category_id set not null;

alter table public.news_items add column if not exists category_id uuid references public.categories(id) on delete cascade;
update public.news_items set category_id = public.default_category_id() where category_id is null;
alter table public.news_items alter column category_id set default public.default_category_id();
alter table public.news_items alter column category_id set not null;

create or replace function public.default_competition_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select competition_id from categories where id = public.default_category_id() $$;

alter table public.friendly_matches add column if not exists competition_id uuid references public.competitions(id) on delete cascade;
update public.friendly_matches set competition_id = public.default_competition_id() where competition_id is null;
alter table public.friendly_matches alter column competition_id set default public.default_competition_id();
alter table public.friendly_matches alter column competition_id set not null;

-- 7. Reglas al modificar perfiles: como en 013, y además
--    * solo un organizador cambia la categoría de un jugador
--    * solo un superadmin nombra superadmins
create or replace function public.check_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and new.is_superadmin is distinct from old.is_superadmin
     and not public.is_superadmin() then
    raise exception 'Solo un superadmin puede nombrar superadmins';
  end if;

  if auth.uid() is not null and not public.is_organizer() then
    if new.is_organizer is distinct from old.is_organizer
       or new.pair_id is distinct from old.pair_id
       or new.active is distinct from old.active
       or new.category_id is distinct from old.category_id then
      raise exception 'Solo un organizador puede cambiar parejas, roles, categorías o desactivar jugadores';
    end if;
    if new.email is distinct from old.email
       and coalesce(current_setting('app.email_change', true), '') <> 'on' then
      raise exception 'El email se cambia desde Mi perfil';
    end if;
  end if;

  -- Desactivado: fuera de su pareja y sin rol de organizador.
  if not new.active then
    new.pair_id := null;
    new.is_organizer := false;
  end if;

  if new.pair_id is not null
     and new.pair_id is distinct from old.pair_id
     and (select count(*) from profiles where pair_id = new.pair_id and id <> new.id) >= 2 then
    raise exception 'Una pareja solo puede tener 2 jugadores';
  end if;

  return new;
end
$$;

-- 8. Permisos de las tablas nuevas (se afinan en el paso 2)
alter table public.competitions enable row level security;
drop policy if exists "Ver ligas de torneo" on public.competitions;
create policy "Ver ligas de torneo" on public.competitions for select to authenticated using (true);
drop policy if exists "Superadmin gestiona ligas de torneo" on public.competitions;
create policy "Superadmin gestiona ligas de torneo" on public.competitions
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

alter table public.categories enable row level security;
drop policy if exists "Ver categorías" on public.categories;
create policy "Ver categorías" on public.categories for select to authenticated using (true);
drop policy if exists "Superadmin gestiona categorías" on public.categories;
create policy "Superadmin gestiona categorías" on public.categories
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

-- 9. Comprobación: debe salir tu nombre como superadmin y todo en "Principal".
select
  (select string_agg(coalesce(full_name, email), ', ') from public.profiles where is_superadmin) as superadmin,
  (select count(*) from public.profiles where category_id is not null) as jugadores_con_categoria,
  (select count(*) from public.profiles where category_id is null) as jugadores_sin_categoria,
  (select count(*) from public.leagues) as temporadas;
