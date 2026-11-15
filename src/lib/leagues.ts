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

/** Descanso: la temporada abierta todavía no ha empezado (migración 026). */
export const isResting = (league: League | null | undefined, now = new Date()) =>
  !!league && !league.ended_at && new Date(league.started_at).getTime() > now.getTime();

/** "lunes, 12 de enero" (hora de Madrid). */
export function formatSeasonStart(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });
}

/** Fecha (AAAA-MM-DD, hora de Madrid) para un campo de fecha. */
export function dateInputValue(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

/** Temporada en curso de la categoría que se está viendo (migración 025). */
export async function currentLeague(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("category_seasons")
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
