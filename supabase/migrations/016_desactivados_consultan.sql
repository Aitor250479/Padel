-- Jugadores desactivados que pueden consultar, y eliminados que conservan su historia.
-- Ejecutar en Supabase > SQL Editor después de 015_encuestas.sql.
--
--  * Un jugador desactivado puede entrar en la web y ver partidos, clasificación,
--    estadísticas y encuestas, pero no puede marcar disponibilidad, votar,
--    poner reservas ni resultados.
--  * Al eliminar un jugador se borra su cuenta (ya no puede entrar), pero su
--    ficha se conserva marcada como eliminada, para que sus partidos sigan
--    contando en la clasificación individual y en las estadísticas.

-- 1. La ficha del jugador ya no se borra al borrar su cuenta.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add column if not exists deleted_at timestamptz;

-- Solo un organizador marca a un jugador como eliminado.
create or replace function public.check_profile_deleted()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_organizer()
     and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Solo un organizador puede eliminar jugadores';
  end if;
  return new;
end
$$;

drop trigger if exists before_profile_deleted on public.profiles;
create trigger before_profile_deleted
  before update on public.profiles
  for each row execute function public.check_profile_deleted();

-- 2. Los desactivados dejan de estar bloqueados para entrar.
update auth.users set banned_until = null
  where id in (select id from public.profiles where active = false);

-- 3. ¿El usuario actual está activo?
create or replace function public.is_active()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select active from profiles where id = auth.uid()), false)
$$;

-- Jugar en una pareja (reservas y resultados) exige estar activo.
create or replace function public.in_pair(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_active() and (
    p = public.my_pair_id()
    or exists (select 1 from pairs where id = p and league_id is not null and auth.uid() in (player_1, player_2))
  )
$$;

-- 4. Disponibilidad: solo los activos marcan la suya.
drop policy if exists "Cada jugador marca la suya" on public.player_availability;
create policy "Cada jugador marca la suya" on public.player_availability
  for all to authenticated
  using ((profile_id = auth.uid() and public.is_active()) or public.is_organizer())
  with check ((profile_id = auth.uid() and public.is_active()) or public.is_organizer());

-- 5. Encuestas: solo votan los activos.
drop policy if exists "Votar" on public.poll_votes;
create policy "Votar" on public.poll_votes for insert to authenticated
  with check (profile_id = auth.uid() and public.is_active());
drop policy if exists "Cambiar mi voto" on public.poll_votes;
create policy "Cambiar mi voto" on public.poll_votes for update to authenticated
  using (profile_id = auth.uid() and public.is_active())
  with check (profile_id = auth.uid() and public.is_active());
