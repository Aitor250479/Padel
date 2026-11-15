-- Ligas y categorías (paso 6 de 7): encuestas, noticias y pantalla de inicio por categoría.
-- Ejecutar en Supabase > SQL Editor después de 026_temporadas_y_descanso.sql.
--
--  * Los textos de la pantalla de inicio (bienvenida, modo, noticias fijas y su
--    orden) pasan a ser de cada categoría: site_texts tiene category_id y la
--    clave es (category_id, key). Lo actual queda en la categoría "Principal".
--  * Vistas para la web con lo de la categoría activa: category_texts,
--    category_polls y category_news.
--  * Encuestas y noticias ya eran de cada categoría (paso 1) y los amistosos de
--    cada liga.
-- Con una sola categoría no cambia nada. Se puede ejecutar más de una vez.

-- 1. Textos por categoría
alter table public.site_texts add column if not exists category_id uuid references public.categories(id) on delete cascade;
update public.site_texts set category_id = public.default_category_id() where category_id is null;
alter table public.site_texts alter column category_id set default public.active_category_id();
alter table public.site_texts alter column category_id set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'site_texts_pkey' and conrelid = 'public.site_texts'::regclass
      and array_length(conkey, 1) = 1
  ) then
    alter table public.site_texts drop constraint site_texts_pkey;
    alter table public.site_texts add primary key (category_id, key);
  end if;
end
$$;

-- 2. Permisos: ver los de mi liga; cambiar los de mi categoría (o que gestiono).
drop policy if exists "Solo mi liga (ver)" on public.site_texts;
create policy "Solo mi liga (ver)" on public.site_texts as restrictive for select to authenticated
  using (public.sees_category(category_id));
drop policy if exists "Solo mi categoría (crear)" on public.site_texts;
create policy "Solo mi categoría (crear)" on public.site_texts as restrictive for insert to authenticated
  with check (public.touches_category(category_id));
drop policy if exists "Solo mi categoría (cambiar)" on public.site_texts;
create policy "Solo mi categoría (cambiar)" on public.site_texts as restrictive for update to authenticated
  using (public.touches_category(category_id)) with check (public.touches_category(category_id));
drop policy if exists "Solo mi categoría (borrar)" on public.site_texts;
create policy "Solo mi categoría (borrar)" on public.site_texts as restrictive for delete to authenticated
  using (public.touches_category(category_id));

-- 3. Lo de la categoría activa, para la web
create or replace view public.category_texts with (security_invoker = true) as
  select * from public.site_texts where category_id = public.active_category_id();

create or replace view public.category_polls with (security_invoker = true) as
  select * from public.polls where category_id = public.active_category_id();

create or replace view public.category_news with (security_invoker = true) as
  select * from public.news_items where category_id = public.active_category_id();

grant select on public.category_texts, public.category_polls, public.category_news to authenticated;

-- 4. Comprobación
select c.name as categoria,
       (select count(*) from public.site_texts t where t.category_id = c.id) as textos,
       (select count(*) from public.polls p where p.category_id = c.id) as encuestas,
       (select count(*) from public.news_items n where n.category_id = c.id) as noticias
from public.categories c order by c.created_at;
