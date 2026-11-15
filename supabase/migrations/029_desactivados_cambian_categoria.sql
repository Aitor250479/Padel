-- Un jugador desactivado se puede cambiar de categoría en cualquier momento
-- (no hace falta que su categoría esté en el descanso).
-- Ejecutar en Supabase > SQL Editor después de 028_invitaciones.sql. Se puede ejecutar más de una vez.

create or replace function public.check_profile_category_rest()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.category_id is distinct from old.category_id
     and old.category_id is not null
     and old.active
     and public.category_playing(old.category_id) then
    raise exception 'Solo se puede cambiar de categoría cuando la suya está en el descanso entre temporadas (o si el jugador está desactivado)';
  end if;
  return new;
end
$$;
