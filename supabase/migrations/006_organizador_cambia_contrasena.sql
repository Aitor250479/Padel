-- Los organizadores pueden poner una contraseña nueva a cualquier jugador.
-- Ejecutar en Supabase > SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_set_password(target uuid, new_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if not public.is_organizer() then
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
$$;

revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
