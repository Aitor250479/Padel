-- Paso 1: parejas, perfiles de jugador y roles.
-- Ejecutar en Supabase > SQL Editor.

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  is_organizer boolean not null default false,
  pair_id uuid references public.pairs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ¿El usuario actual es organizador?
create or replace function public.is_organizer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_organizer from profiles where id = auth.uid()), false)
$$;

-- Al registrarse se crea su perfil. El primer usuario es organizador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, email, is_organizer)
  values (new.id, new.email, not exists (select 1 from profiles));
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reglas al modificar perfiles:
--  * un jugador solo puede cambiar su nombre
--  * una pareja tiene como máximo 2 jugadores
create or replace function public.check_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_organizer() then
    if new.is_organizer is distinct from old.is_organizer
       or new.pair_id is distinct from old.pair_id
       or new.email is distinct from old.email then
      raise exception 'Solo un organizador puede cambiar parejas o roles';
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

create trigger before_profile_update
  before update on public.profiles
  for each row execute function public.check_profile_update();

-- Seguridad por filas
alter table public.pairs enable row level security;
alter table public.profiles enable row level security;

create policy "Ver parejas" on public.pairs
  for select to authenticated using (true);
create policy "Organizadores gestionan parejas" on public.pairs
  for all to authenticated using (public.is_organizer()) with check (public.is_organizer());

create policy "Ver perfiles" on public.profiles
  for select to authenticated using (true);
create policy "Editar mi perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Organizadores editan perfiles" on public.profiles
  for update to authenticated using (public.is_organizer()) with check (true);
