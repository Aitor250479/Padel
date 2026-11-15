-- Ligas y categorías (paso 2 de 7): roles y seguridad.
-- Ejecutar en Supabase > SQL Editor después de 023_ligas_y_categorias.sql.
--
-- Roles:
--  * Superadmin (profiles.is_superadmin): todo.
--  * Organizador de liga (tabla competition_admins): todas las categorías de su
--    liga; es el único que nombra organizadores y cambia jugadores de categoría.
--  * Organizador de categoría (profiles.is_organizer): lo de siempre, pero solo
--    en su categoría.
--  * Jugador: lo de siempre, en su categoría.
--
-- Seguridad:
--  * Cada uno solo VE lo de su liga (no ve nada de otras ligas).
--  * Cada uno solo TOCA lo de su categoría (o lo que gestiona).
--
-- Con una sola liga y una sola categoría, para los jugadores no cambia nada.
-- Los organizadores actuales pasan a ser organizadores de su categoría (ya no
-- pueden nombrar organizadores: eso lo hace el superadmin o el de liga).
-- Se puede ejecutar más de una vez.

-- 1. Organizadores de liga
create table if not exists public.competition_admins (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (competition_id, profile_id)
);

-- 2. Funciones de ayuda (security definer: leen sin pasar por los permisos)
create or replace function public.my_category_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select category_id from profiles where id = auth.uid() $$;

create or replace function public.category_competition(cat uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select competition_id from categories where id = cat $$;

create or replace function public.my_competition_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select public.category_competition(public.my_category_id()) $$;

-- ¿Soy organizador de esa liga? (el superadmin lo es de todas)
create or replace function public.is_league_admin(comp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1 from competition_admins a join profiles p on p.id = a.profile_id
    where a.competition_id = comp and a.profile_id = auth.uid() and p.active and p.deleted_at is null
  )
$$;

-- ¿Soy organizador de alguna liga?
create or replace function public.is_any_league_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1 from competition_admins a join profiles p on p.id = a.profile_id
    where a.profile_id = auth.uid() and p.active and p.deleted_at is null
  )
$$;

-- ¿Gestiono esa categoría? (superadmin, organizador de su liga u organizador de ella)
create or replace function public.manages_category(cat uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select cat is not null and (
    public.is_league_admin(public.category_competition(cat))
    or exists (
      select 1 from profiles
      where id = auth.uid() and category_id = cat and is_organizer and active and deleted_at is null
    )
  )
$$;

-- Organizador = gestiona su propia categoría (o es de liga / superadmin).
-- Es la función que ya usan todos los permisos y la web.
create or replace function public.is_organizer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.manages_category(public.my_category_id()) or public.is_any_league_admin()
$$;

-- ¿Gestiono a ese jugador? Un pendiente de categoría lo gestionan el
-- superadmin y los organizadores de liga.
create or replace function public.manages_profile(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when (select category_id from profiles where id = target) is null then public.is_any_league_admin()
    else public.manages_category((select category_id from profiles where id = target))
  end
$$;

-- ¿Veo esa liga / esa categoría?
create or replace function public.sees_competition(comp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select comp = public.my_competition_id() or public.is_league_admin(comp) $$;

create or replace function public.sees_category(cat uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.sees_competition(public.category_competition(cat)), false) $$;

-- ¿Puedo tocar esa categoría? (la mía o una que gestiono)
create or replace function public.touches_category(cat uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select cat is not null and (cat = public.my_category_id() or public.manages_category(cat)) $$;

-- Categoría de cada cosa
create or replace function public.league_category(l uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select category_id from leagues where id = l $$;

create or replace function public.match_category(m uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select l.category_id from matches x join leagues l on l.id = x.league_id where x.id = m $$;

create or replace function public.poll_category(p uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select category_id from polls where id = p $$;

create or replace function public.profile_category(p uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select category_id from profiles where id = p $$;

-- Pareja de liga individual: la de su temporada. Pareja fija: la de sus jugadores
-- (vacía si no tiene jugadores).
create or replace function public.pair_category(p uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select l.category_id from pairs x join leagues l on l.id = x.league_id where x.id = p),
    (select category_id from profiles where pair_id = p and category_id is not null order by id limit 1)
  )
$$;

create or replace function public.friendly_competition(m uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select competition_id from friendly_matches where id = m $$;

-- 3. Los organizadores actuales: organizadores de su categoría (no cambia nada,
--    ya tienen is_organizer). El superadmin no necesita ser organizador de liga.

-- 4. Temporada en curso: la de MI categoría (antes, la única de la web)
create or replace function public.current_league_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from leagues
  where ended_at is null and category_id = coalesce(public.my_category_id(), public.default_category_id())
  limit 1
$$;

-- Reiniciar: cierra solo la temporada de mi categoría.
create or replace function public.start_new_league(new_name text, new_kind text default 'parejas')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  clean text := trim(new_name);
  cat uuid := coalesce(public.my_category_id(), public.default_category_id());
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

-- Ya no se usa y borraba los partidos de toda la web.
drop function if exists public.reset_league();

-- Participación en una encuesta: sobre los jugadores de su categoría.
create or replace function public.poll_participation(p uuid)
returns table (voted int, eligible int)
language plpgsql stable security definer set search_path = public
as $$
declare
  cat uuid := public.poll_category(p);
begin
  if not public.manages_category(cat) then
    raise exception 'Solo los organizadores ven la participación';
  end if;
  return query
    select
      (select count(*)::int from poll_votes v join profiles pr on pr.id = v.profile_id
        where v.poll_id = p and pr.active and pr.deleted_at is null),
      (select count(*)::int from profiles where active and deleted_at is null and category_id = cat);
end
$$;

-- 5. Reglas al modificar perfiles
--    * jugador: solo su nombre (como siempre)
--    * organizador de categoría: parejas y desactivar, en su categoría
--    * organizador de liga / superadmin: además nombra organizadores y cambia
--      jugadores de categoría (al cambiar de categoría pierde pareja y rol)
--    * solo un superadmin nombra superadmins
create or replace function public.check_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.is_superadmin is distinct from old.is_superadmin and not public.is_superadmin() then
      raise exception 'Solo un superadmin puede nombrar superadmins';
    end if;

    if (new.is_organizer is distinct from old.is_organizer or new.category_id is distinct from old.category_id)
       and not (
         (old.category_id is null and public.is_any_league_admin()
           or public.is_league_admin(public.category_competition(old.category_id)))
         and (new.category_id is null and public.is_any_league_admin()
           or public.is_league_admin(public.category_competition(new.category_id)))
       ) then
      raise exception 'Solo el organizador de la liga puede nombrar organizadores o cambiar jugadores de categoría';
    end if;

    if (new.pair_id is distinct from old.pair_id or new.active is distinct from old.active)
       and not public.manages_profile(old.id) then
      raise exception 'Solo un organizador puede cambiar parejas, roles, categorías o desactivar jugadores';
    end if;

    if new.email is distinct from old.email
       and coalesce(current_setting('app.email_change', true), '') <> 'on' then
      raise exception 'El email se cambia desde Mi perfil';
    end if;
  end if;

  -- Cambio de categoría: sale de su pareja y deja de ser organizador.
  if new.category_id is distinct from old.category_id then
    new.pair_id := null;
    new.is_organizer := false;
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

-- 6. Funciones sobre otro jugador: solo quien lo gestiona.
CREATE OR REPLACE FUNCTION public.admin_set_password(target uuid, new_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.manages_profile(target) then
    raise exception 'Solo un organizador puede cambiar contraseñas de otros';
  end if;
  if new_password is null or length(new_password) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = target;
  if not found then
    raise exception 'Jugador no encontrado';
  end if;
end
$function$

;

CREATE OR REPLACE FUNCTION public.change_email(target uuid, new_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  clean text := lower(trim(new_email));
begin
  if auth.uid() is null or (auth.uid() <> target and not public.manages_profile(target)) then
    raise exception 'Solo puedes cambiar tu propio email';
  end if;
  if clean is null or clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El email no es válido';
  end if;
  if exists (select 1 from auth.users where lower(email) = clean and id <> target) then
    raise exception 'Ese email ya lo usa otro jugador';
  end if;

  update auth.users
     set email = clean,
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = target;
  if not found then
    raise exception 'Jugador no encontrado';
  end if;

  update auth.identities
     set identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(clean)),
         updated_at = now()
   where user_id = target and provider = 'email';

  perform set_config('app.email_change', 'on', true);
  update public.profiles set email = clean where id = target;
  perform set_config('app.email_change', 'off', true);
end
$function$

;

CREATE OR REPLACE FUNCTION public.set_initial_level(target uuid, level numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.manages_profile(target) then
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
$function$

;

CREATE OR REPLACE FUNCTION public.save_level_form(target uuid, answers smallint[])
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  -- Respuesta más alta de cada pregunta, en el mismo orden que la web.
  max_answer smallint[] := array[3, 3, 2, 3, 3, 3, 3, 3];
  organizer boolean := public.manages_profile(target);
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
$function$

;


-- 7. Permisos de ligas, categorías y organizadores de liga
alter table public.competitions enable row level security;
drop policy if exists "Ver ligas de torneo" on public.competitions;
create policy "Ver ligas de torneo" on public.competitions
  for select to authenticated using (public.sees_competition(id));

alter table public.categories enable row level security;
drop policy if exists "Ver categorías" on public.categories;
create policy "Ver categorías" on public.categories
  for select to authenticated using (public.sees_competition(competition_id));
drop policy if exists "Organizador de liga gestiona categorías" on public.categories;
create policy "Organizador de liga gestiona categorías" on public.categories
  for all to authenticated
  using (public.is_league_admin(competition_id)) with check (public.is_league_admin(competition_id));

alter table public.competition_admins enable row level security;
drop policy if exists "Ver organizadores de liga" on public.competition_admins;
create policy "Ver organizadores de liga" on public.competition_admins
  for select to authenticated using (public.sees_competition(competition_id));
drop policy if exists "Superadmin nombra organizadores de liga" on public.competition_admins;
create policy "Superadmin nombra organizadores de liga" on public.competition_admins
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

-- 8. Separación por liga y categoría en todas las tablas.
--    Son permisos "restrictivos": se suman a los que ya había (no los sustituyen).
--    Ver: lo de mi liga. Crear, cambiar o borrar: lo de mi categoría (o que gestiono).
do $$
declare
  r record;
begin
  for r in select * from (values
    ('leagues',             'public.sees_category(category_id)',                               'public.touches_category(category_id)'),
    ('matches',             'public.sees_category(public.league_category(league_id))',         'public.touches_category(public.league_category(league_id))'),
    ('match_results',       'public.sees_category(public.match_category(match_id))',           'public.touches_category(public.match_category(match_id))'),
    ('match_players',       'public.sees_category(public.match_category(match_id))',           'public.touches_category(public.match_category(match_id))'),
    ('pairs',               'case when public.pair_category(id) is null then public.is_organizer() else public.sees_category(public.pair_category(id)) end',
                            'case when public.pair_category(id) is null then public.is_organizer() else public.touches_category(public.pair_category(id)) end'),
    ('profiles',            'id = auth.uid() or case when category_id is null then public.is_any_league_admin() else public.sees_category(category_id) end',
                            'id = auth.uid() or case when category_id is null then public.is_any_league_admin() else public.manages_category(category_id) end'),
    ('player_availability', 'public.sees_category(public.profile_category(profile_id))',       'profile_id = auth.uid() or public.manages_profile(profile_id)'),
    ('player_levels',       'public.sees_category(public.profile_category(profile_id))',       'profile_id = auth.uid() or public.manages_profile(profile_id)'),
    ('polls',               'public.sees_category(category_id)',                               'public.touches_category(category_id)'),
    ('poll_options',        'public.sees_category(public.poll_category(poll_id))',             'public.touches_category(public.poll_category(poll_id))'),
    ('poll_votes',          'public.sees_category(public.poll_category(poll_id))',             'public.touches_category(public.poll_category(poll_id))'),
    ('news_items',          'public.sees_category(category_id)',                               'public.touches_category(category_id)'),
    ('friendly_matches',    'public.sees_competition(competition_id)',                         'public.sees_competition(competition_id)'),
    ('friendly_players',    'public.sees_competition(public.friendly_competition(match_id))',  'public.sees_competition(public.friendly_competition(match_id))')
  ) as t(tabla, ver, tocar) loop
    execute format('drop policy if exists "Solo mi liga (ver)" on public.%I', r.tabla);
    execute format('create policy "Solo mi liga (ver)" on public.%I as restrictive for select to authenticated using (%s)', r.tabla, r.ver);
    execute format('drop policy if exists "Solo mi categoría (crear)" on public.%I', r.tabla);
    execute format('create policy "Solo mi categoría (crear)" on public.%I as restrictive for insert to authenticated with check (%s)', r.tabla, r.tocar);
    execute format('drop policy if exists "Solo mi categoría (cambiar)" on public.%I', r.tabla);
    execute format('create policy "Solo mi categoría (cambiar)" on public.%I as restrictive for update to authenticated using (%s) with check (%s)', r.tabla, r.tocar, r.tocar);
    execute format('drop policy if exists "Solo mi categoría (borrar)" on public.%I', r.tabla);
    execute format('create policy "Solo mi categoría (borrar)" on public.%I as restrictive for delete to authenticated using (%s)', r.tabla, r.tocar);
  end loop;
end
$$;

-- 9. Comprobación
select
  (select string_agg(coalesce(full_name, email), ', ') from public.profiles where is_superadmin) as superadmin,
  (select string_agg(coalesce(full_name, email), ', ' order by full_name) from public.profiles where is_organizer and active) as organizadores_de_categoria,
  (select count(*) from pg_policies where schemaname = 'public' and policyname like 'Solo mi %') as permisos_nuevos;
