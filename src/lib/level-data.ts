import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLevels, type LevelMatch, type LevelPlayer } from "@/lib/level";

export type LevelRow = { profile_id: string; answers: number[] | null; initial_level: number; updated_at: string };

const PAGE = 1000;

/** Todas las filas de una consulta, de mil en mil (Supabase devuelve como mucho mil). */
async function all<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

/**
 * Niveles de todos los jugadores, calculados con todos los partidos oficiales
 * confirmados de todas las ligas. Los amistosos no cuentan.
 */
export async function loadLevels(supabase: SupabaseClient) {
  const [matches, players, initial] = await Promise.all([
    all<LevelMatch>((from, to) =>
      supabase
        .from("matches")
        .select("id, week_start, booking_at, result_at, pair_a, pair_b, sets_a, sets_b")
        .not("sets_a", "is", null)
        .not("sets_b", "is", null)
        .neq("status", "cancelado")
        .order("id")
        .range(from, to),
    ),
    all<LevelPlayer>((from, to) =>
      supabase.from("match_players").select("match_id, profile_id, pair_id").order("match_id").order("profile_id").range(from, to),
    ),
    // Sin la migración 021 la tabla no existe: todos cuentan como 1,00.
    all<LevelRow>((from, to) =>
      supabase.from("player_levels").select("profile_id, answers, initial_level, updated_at").order("profile_id").range(from, to),
    ),
  ]);
  const levels = computeLevels(matches, players, new Map(initial.map((r) => [r.profile_id, Number(r.initial_level)])));
  return { levels, forms: new Map(initial.map((r) => [r.profile_id, r])) };
}
