-- Recuento de participación de la encuesta para los organizadores.
-- Ejecutar en Supabase > SQL Editor después de 016_desactivados_consultan.sql.
--
-- Mientras la encuesta está abierta nadie puede leer los votos de los demás,
-- así que esta función solo devuelve cuántos han votado y cuántos pueden
-- votar (jugadores activos), sin decir quién ni qué.

create or replace function public.poll_participation(p uuid)
returns table (voted int, eligible int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_organizer() then
    raise exception 'Solo los organizadores ven la participación';
  end if;
  return query
    select
      (select count(*)::int from poll_votes v join profiles pr on pr.id = v.profile_id
        where v.poll_id = p and pr.active and pr.deleted_at is null),
      (select count(*)::int from profiles where active and deleted_at is null);
end
$$;

revoke all on function public.poll_participation(uuid) from public;
grant execute on function public.poll_participation(uuid) to authenticated;
