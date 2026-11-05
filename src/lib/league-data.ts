import type { SupabaseClient } from "@supabase/supabase-js";
import { onlyLeague, type League } from "@/lib/leagues";
import { MATCH_COLUMNS, type Match } from "@/lib/matches";
import { computeStandings } from "@/lib/standings";

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
  return { matches, rows: computeStandings(ids, matches) };
}
