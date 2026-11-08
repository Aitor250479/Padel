import type { SupabaseClient } from "@supabase/supabase-js";

export type LeagueKind = "parejas" | "individual";

export type League = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  /** Por parejas fijas o individual (parejas nuevas cada semana). Migración 014. */
  kind?: LeagueKind;
};

export const LEAGUE_COLUMNS = "id, name, started_at, ended_at, kind";

export const isIndividual = (league: League | null | undefined) => league?.kind === "individual";

/** Liga en curso (o null si todavía no se ha ejecutado la migración de ligas). */
export async function currentLeague(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("leagues")
    .select(LEAGUE_COLUMNS)
    .is("ended_at", null)
    .maybeSingle<League>();
  return data ?? null;
}

/** Añade el filtro "solo partidos de esta liga" (si hay ligas). */
export function onlyLeague<Q>(query: Q, league: League | null): Q {
  if (!league) return query;
  return (query as unknown as { eq: (column: string, value: string) => Q }).eq("league_id", league.id);
}
