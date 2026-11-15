-- Copia de seguridad de todas las tablas de la web.
-- Ejecutar en Supabase > SQL Editor ANTES de una migración grande.
--
-- Copia cada tabla de "public" en una carpeta aparte (esquema copia_2026_11),
-- dentro de la misma base de datos. La web no la ve ni la usa.
-- Si se ejecuta otra vez, sustituye la copia anterior por una nueva.
-- No copia las cuentas (emails y contraseñas): las migraciones no las tocan.
-- Para volver atrás: restaurar_copia.sql.

create schema if not exists copia_2026_11;
revoke all on schema copia_2026_11 from public, anon, authenticated;

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' order by tablename loop
    execute format('drop table if exists copia_2026_11.%I', t);
    execute format('create table copia_2026_11.%I as table public.%I', t, t);
  end loop;
end
$$;

-- Comprobación: cada tabla con el número de filas copiadas.
select c.table_name as tabla,
       (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from copia_2026_11.%I', c.table_name), false, true, '')))[1]::text::int as filas_copiadas
from information_schema.tables c
where c.table_schema = 'copia_2026_11'
order by 1;
