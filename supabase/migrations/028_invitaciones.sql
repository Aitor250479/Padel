-- Ligas y categorías (paso 7 de 7): invitaciones y jugadores pendientes de categoría.
-- Ejecutar en Supabase > SQL Editor después de 027_inicio_por_categoria.sql.
--
--  * Cada categoría y cada liga tienen un código de invitación (8 letras y
--    números). El enlace es /unete/<código>:
--      - el de una categoría mete al jugador nuevo en esa categoría;
--      - el de una liga (invitación genérica) lo deja "pendiente de categoría"
--        en esa liga, hasta que un organizador de la liga le asigne una.
--    El enlace antiguo /unete (sin código) sigue metiendo en "Principal".
--  * Se puede cambiar el código (el enlace anterior deja de valer).
--  * Un jugador pendiente solo ve su perfil y el formulario de nivel; lo ven y
--    lo gestionan los organizadores de su liga.
-- Se puede ejecutar más de una vez.

-- 1. Códigos de invitación
create or replace function public.new_invite_code()
returns text
language sql volatile
as $$ select substr(md5(gen_random_uuid()::text), 1, 8) $$;

alter table public.categories add column if not exists invite_code text;
update public.categories set invite_code = public.new_invite_code() where invite_code is null;
alter table public.categories alter column invite_code set default public.new_invite_code();
alter table public.categories alter column invite_code set not null;

alter table public.competitions add column if not exists invite_code text;
update public.competitions set invite_code = public.new_invite_code() where invite_code is null;
alter table public.competitions alter column invite_code set default public.new_invite_code();
alter table public.competitions alter column invite_code set not null;

create unique index if not exists categories_invite_code on public.categories (invite_code);
create unique index if not exists competitions_invite_code on public.competitions (invite_code);

-- Qué es un código (se usa sin haber entrado, en la pantalla de crear cuenta).
create or replace function public.invite_info(code text)
returns table (kind text, competition_name text, category_name text)
language sql stable security definer set search_path = public
as $$
  select 'categoria', l.name, c.name
    from categories c join competitions l on l.id = c.competition_id
    where c.invite_code = lower(trim(code))
  union all
  select 'liga', l.name, null
    from competitions l
    where l.invite_code = lower(trim(code))
  limit 1
$$;
grant execute on function public.invite_info(text) to anon, authenticated;

-- Cambiar el código: el enlace anterior deja de valer.
create or replace function public.renew_invite_code(target uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  code text := public.new_invite_code();
begin
  if exists (select 1 from categories where id = target) then
    if not public.manages_category(target) then
      raise exception 'Solo un organizador de la categoría puede cambiar su invitación';
    end if;
    update categories set invite_code = code where id = target;
  elsif exists (select 1 from competitions where id = target) then
    if not public.is_league_admin(target) then
      raise exception 'Solo un organizador de la liga puede cambiar su invitación';
    end if;
    update competitions set invite_code = code where id = target;
  else
    raise exception 'No existe';
  end if;
  return code;
end
$$;

-- 2. Pendientes de categoría: en qué liga esperan
alter table public.profiles add column if not exists pending_competition_id uuid
  references public.competitions(id) on delete set null;

-- Al darle categoría deja de estar pendiente. La liga de espera solo la cambia
-- un organizador de liga.
create or replace function public.clear_pending_competition()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null
     and new.pending_competition_id is distinct from old.pending_competition_id
     and new.category_id is null and not public.is_any_league_admin() then
    raise exception 'Solo un organizador de liga puede cambiar eso';
  end if;
  if new.category_id is not null then
    new.pending_competition_id := null;
  end if;
  return new;
end
$$;

drop trigger if exists before_profile_pending on public.profiles;
create trigger before_profile_pending
  before insert or update on public.profiles
  for each row execute function public.clear_pending_competition();

-- ¿Organizo la liga en la que espera este pendiente? (sin liga: cualquiera)
create or replace function public.manages_pending(comp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select case when comp is null then public.is_any_league_admin() else public.is_league_admin(comp) end $$;

create or replace function public.manages_profile(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when (select category_id from profiles where id = target) is null
      then public.manages_pending((select pending_competition_id from profiles where id = target))
    else public.manages_category((select category_id from profiles where id = target))
  end
$$;

drop policy if exists "Solo mi liga (ver)" on public.profiles;
create policy "Solo mi liga (ver)" on public.profiles as restrictive for select to authenticated
  using (id = auth.uid() or case when category_id is null then public.manages_pending(pending_competition_id)
                                 else public.sees_category(category_id) end);
drop policy if exists "Solo mi categoría (crear)" on public.profiles;
create policy "Solo mi categoría (crear)" on public.profiles as restrictive for insert to authenticated
  with check (id = auth.uid() or case when category_id is null then public.manages_pending(pending_competition_id)
                                      else public.manages_category(category_id) end);
drop policy if exists "Solo mi categoría (cambiar)" on public.profiles;
create policy "Solo mi categoría (cambiar)" on public.profiles as restrictive for update to authenticated
  using (id = auth.uid() or case when category_id is null then public.manages_pending(pending_competition_id)
                                 else public.manages_category(category_id) end)
  with check (id = auth.uid() or case when category_id is null then public.manages_pending(pending_competition_id)
                                      else public.manages_category(category_id) end);
drop policy if exists "Solo mi categoría (borrar)" on public.profiles;
create policy "Solo mi categoría (borrar)" on public.profiles as restrictive for delete to authenticated
  using (id = auth.uid() or case when category_id is null then public.manages_pending(pending_competition_id)
                                 else public.manages_category(category_id) end);

-- 3. Al crear la cuenta: categoría o liga según la invitación
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  code text := lower(trim(coalesce(new.raw_user_meta_data ->> 'invitacion', '')));
  cat uuid;
  comp uuid;
begin
  if code <> '' then
    select id into cat from categories where invite_code = code;
    if cat is null then
      select id into comp from competitions where invite_code = code;
    end if;
  end if;

  insert into profiles (id, email, is_organizer, category_id, pending_competition_id)
  values (
    new.id,
    new.email,
    not exists (select 1 from profiles),
    case when comp is not null then null else coalesce(cat, public.default_category_id()) end,
    comp
  );
  return new;
end
$$;

-- 4. Un pendiente no ve ninguna categoría (antes caía en la primera).
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
  if c is null and public.is_superadmin() then
    c := public.default_category_id();
  end if;
  return c;
end
$$;

-- 5. Comprobación: cada liga y categoría con su código.
select l.name as liga, l.invite_code as invitacion_liga, c.name as categoria, c.invite_code as invitacion_categoria
from public.competitions l join public.categories c on c.competition_id = l.id
order by l.created_at, c.created_at;
