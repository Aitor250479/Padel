-- Estadísticas por jugador: quién jugó cada partido.
-- Las parejas pueden cambiar (sorteos, ligas nuevas), así que al confirmarse el
-- resultado de un partido se guarda qué jugadores formaban cada pareja.
-- Ejecutar después de 010_ligas.sql.

create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  primary key (match_id, profile_id)
);

create index if not exists match_players_profile_idx on public.match_players (profile_id);

alter table public.match_players enable row level security;
drop policy if exists "Ver quién jugó" on public.match_players;
create policy "Ver quién jugó" on public.match_players for select to authenticated using (true);
-- No hay políticas de escritura: solo la rellena el trigger.

create or replace function public.record_match_players()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.sets_a is null or new.status = 'cancelado' then
    delete from match_players where match_id = new.id;
  elsif tg_op = 'INSERT' or old.sets_a is null or old.status = 'cancelado'
        or new.pair_a is distinct from old.pair_a or new.pair_b is distinct from old.pair_b then
    delete from match_players where match_id = new.id;
    insert into match_players (match_id, profile_id, pair_id)
    select new.id, p.id, p.pair_id from profiles p where p.pair_id in (new.pair_a, new.pair_b)
    on conflict do nothing;
  end if;
  return null;
end
$$;

drop trigger if exists after_match_players on public.matches;
create trigger after_match_players
  after insert or update on public.matches
  for each row execute function public.record_match_players();

-- Partidos ya confirmados: se asignan los jugadores que tiene ahora cada pareja.
insert into public.match_players (match_id, profile_id, pair_id)
select m.id, p.id, p.pair_id
from public.matches m
join public.profiles p on p.pair_id in (m.pair_a, m.pair_b)
where m.sets_a is not null and m.status <> 'cancelado'
on conflict do nothing;
