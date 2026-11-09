-- Noticias escritas por los organizadores: hasta 600 caracteres (antes 150).
-- Ejecutar en Supabase > SQL Editor después de 018_noticias_y_tarjetas_encuesta.sql.

alter table public.news_items drop constraint if exists news_items_body_check;
alter table public.news_items
  add constraint news_items_body_check check (length(trim(body)) > 0 and length(body) <= 600);
