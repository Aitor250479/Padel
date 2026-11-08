import type { SupabaseClient } from "@supabase/supabase-js";
import { onlyLeague, type League } from "@/lib/leagues";
import { MATCH_COLUMNS, type Match } from "@/lib/matches";
import { displayName, type Profile } from "@/lib/session";
import { computePlayerStandings, computeStandings, type MatchPlayerRow } from "@/lib/standings";

/** Partidos y clasificación de una liga (o de todo si no hay ligas). */
export async function leagueStandings(
  supabase: SupabaseClient,
  league: League | null,
  pairIds: string[],
  { onlyPlayed = false } = {},
) {
  const { data } = await onlyLeague(supabase.from("matches").select(MATCH_COLUMNS), league)
    .order("week_start")
    .returns<Match[]>();
  const matches = data ?? [];
  // En una liga terminada solo salen las parejas que jugaron en ella.
  const ids = onlyPlayed
    ? [...new Set(matches.filter((m) => m.status !== "cancelado").flatMap((m) => [m.pair_a, m.pair_b]))]
    : pairIds;
  return {
    matches,
    rows: computeStandings(ids, matches).map(({ pairId, ...r }) => ({ id: pairId, ...r })),
  };
}

/**
 * Clasificación individual de una liga. Cada jugador suma los puntos de los
 * partidos que jugó, con la pareja que tenía entonces (tabla match_players).
 * En la liga en curso también salen, con 0, los jugadores activos con pareja
 * (en una liga individual, todos los activos).
 */
export async function leaguePlayerStandings(
  supabase: SupabaseClient,
  matches: Match[],
  { includeCurrentPlayers = false, individual = false } = {},
) {
  const played = matches.filter((m) => m.status !== "cancelado" && m.sets_a !== null).map((m) => m.id);
  const [{ data: players }, { data: people }] = await Promise.all([
    played.length
      ? supabase
          .from("match_players")
          .select("match_id, profile_id, pair_id")
          .in("match_id", played)
          .returns<MatchPlayerRow[]>()
      : Promise.resolve({ data: [] as MatchPlayerRow[] }),
    supabase.from("profiles").select("id, email, full_name, is_organizer, pair_id, active").returns<Profile[]>(),
  ]);
  const everyone = people ?? [];
  const base = includeCurrentPlayers
    ? everyone.filter((p) => p.active !== false && (individual || p.pair_id)).map((p) => p.id)
    : [];
  const rows = computePlayerStandings(base, matches, players ?? []).map(({ playerId, ...r }) => {
    const p = everyone.find((x) => x.id === playerId);
    return { id: playerId, ...r, note: p && p.active === false ? "(baja)" : undefined };
  });
  const nameOf = (id: string) => {
    const p = everyone.find((x) => x.id === id);
    return p ? displayName(p) : "Jugador borrado";
  };
  return { rows, nameOf };
}
