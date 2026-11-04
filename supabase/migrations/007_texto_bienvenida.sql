-- Texto de bienvenida que se muestra en la pantalla principal.
-- Lo editan los organizadores desde "Texto de Bienvenida".

create table if not exists public.site_texts (
  key text primary key,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_texts enable row level security;

drop policy if exists "Ver textos" on public.site_texts;
create policy "Ver textos" on public.site_texts
  for select to authenticated using (true);

drop policy if exists "Organizadores editan textos" on public.site_texts;
create policy "Organizadores editan textos" on public.site_texts
  for all to authenticated using (public.is_organizer()) with check (public.is_organizer());

insert into public.site_texts (key, body) values (
  'bienvenida',
  E'¡Bienvenidos al Torneo Pádel Loyola! 🎾\n\nGracias a todos por apuntaros. No hay premio en metálico, pero sí gloria eterna (hasta el próximo torneo) y derecho a vacilar en el grupo.\n\nObjetivo principal: acabar con las mismas rodillas con las que empezamos. Estirad, hidratad y si la bola se va a la valla, dejadla ir.\n\n¡Suerte a todos y que gane el que menos se queje!'
) on conflict (key) do nothing;
