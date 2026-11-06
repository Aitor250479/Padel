-- Jugadores activos / desactivados.
-- Ejecutar en Supabase > SQL Editor después de 012_reglas_jugadores.sql.
--
--  * Un jugador desactivado sale de su pareja, no entra en los sorteos de
--    parejas, deja de ser organizador y no puede entrar en la web.
--  * Solo un organizador puede desactivar o reactivar jugadores.
--  * Sus partidos y estadísticas anteriores se conservan.

alter table public.profiles add column if not exists active boolean not null default true;

-- Un organizador desactivado deja de tener permisos de organizador.
create or replace function public.is_organizer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_organizer and active from profiles where id = auth.uid()), false)
$$;

create or replace function public.check_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_organizer() then
    if new.is_organizer is distinct from old.is_organizer
       or new.pair_id is distinct from old.pair_id
       or new.active is distinct from old.active then
      raise exception 'Solo un organizador puede cambiar parejas, roles o desactivar jugadores';
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
