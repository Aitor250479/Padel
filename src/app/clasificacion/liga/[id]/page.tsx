import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import StandingsTable from "@/components/StandingsTable";
import StandingsTabs from "@/components/StandingsTabs";
import { leaguePlayerStandings, leagueStandings } from "@/lib/league-data";
import { LEAGUE_COLUMNS, isIndividual, type League } from "@/lib/leagues";
import { loadPairDirectory } from "@/lib/matches";
import { requireProfile } from "@/lib/session";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
}

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { id } = await params;
  const wantsPlayers = (await searchParams).vista === "jugadores";
  const [{ data: league }, { pairName }] = await Promise.all([
    supabase.from("leagues").select(LEAGUE_COLUMNS).eq("id", id).maybeSingle<League>(),
    loadPairDirectory(supabase),
  ]);
  if (!league) notFound();
  const individualLeague = isIndividual(league);
  const individual = individualLeague || wantsPlayers;
  const { rows, matches } = await leagueStandings(supabase, league, [], { onlyPlayed: true });
  const players = individual ? await leaguePlayerStandings(supabase, matches) : null;
  const champion = league.ended_at && !individualLeague && rows[0]?.played ? rows[0] : null;
  const playerChampion =
    league.ended_at && individualLeague && players?.rows[0]?.played ? players.rows[0] : null;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/clasificacion" className="text-sm underline opacity-70">
          ← Clasificación
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{league.name}</h1>
        <p className="mb-4 text-sm opacity-70">
          {league.ended_at
            ? `Clasificación final · del ${formatDate(league.started_at)} al ${formatDate(league.ended_at)}`
            : `Liga en curso · desde el ${formatDate(league.started_at)}`}
        </p>
        {champion && (
          <p className="mb-4 rounded-xl bg-lime-100 p-3 text-center font-semibold text-neutral-900">
            🏆 Campeones: {pairName(champion.id)} con {champion.points} puntos
          </p>
        )}
        {playerChampion && players && (
          <p className="mb-4 rounded-xl bg-lime-100 p-3 text-center font-semibold text-neutral-900">
            🏆 Campeón: {players.nameOf(playerChampion.id)} con {playerChampion.points} puntos
          </p>
        )}
        {rows.length > 0 && !individualLeague && <StandingsTabs base={`/clasificacion/liga/${league.id}`} players={individual} />}
        {players ? (
          <>
            <StandingsTable
              rows={players.rows}
              nameOf={players.nameOf}
              label="Jugador"
              highlight={profile.id}
              hrefFor={(pid) => `/jugadores/${pid}/estadisticas`}
            />
            <p className="mt-2 text-xs opacity-60">Pulsa en un jugador para ver sus estadísticas.</p>
          </>
        ) : rows.length ? (
          <>
            <StandingsTable
              rows={rows}
              nameOf={pairName}
              highlight={profile.pair_id}
              hrefFor={(pairId) => `/clasificacion/liga/${league.id}/pareja/${pairId}`}
            />
            <p className="mt-2 text-xs opacity-60">Pulsa en una pareja para ver sus partidos.</p>
          </>
        ) : (
          <p className="opacity-70">En esta liga no se jugó ningún partido.</p>
        )}
      </main>
    </>
  );
}
