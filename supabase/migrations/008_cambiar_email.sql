-- Cambiar el email de acceso de un jugador.
-- Lo puede hacer el propio jugador (desde Mi perfil) o un organizador.
-- El cambio es inmediato: a partir de ese momento se entra con el email nuevo.

create or replace function public.change_email(target uuid, new_email text)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare
  clean text := lower(trim(new_email));
begin
  if auth.uid() is null or (auth.uid() <> target and not public.is_organizer()) then
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
$$;

revoke all on function public.change_email(uuid, text) from public, anon;
grant execute on function public.change_email(uuid, text) to authenticated;

-- El trigger de perfiles impedía a un jugador cambiar su email:
-- ahora se permite solo cuando viene de change_email.
create or replace function public.check_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_organizer() then
    if new.is_organizer is distinct from old.is_organizer
       or new.pair_id is distinct from old.pair_id then
      raise exception 'Solo un organizador puede cambiar parejas o roles';
    end if;
    if new.email is distinct from old.email
       and coalesce(current_setting('app.email_change', true), '') <> 'on' then
      raise exception 'El email se cambia desde Mi perfil';
    end if;
  end if;

  if new.pair_id is not null
     and new.pair_id is distinct from old.pair_id
     and (select count(*) from profiles where pair_id = new.pair_id and id <> new.id) >= 2 then
    raise exception 'Una pareja solo puede tener 2 jugadores';
  end if;

  return new;
end
$$;
