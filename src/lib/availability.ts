import type { SupabaseClient } from "@supabase/supabase-js";

/** Parejas en las que los dos jugadores han dicho que pueden jugar esa semana. */
export async function availablePairIds(
  supabase: SupabaseClient,
  weekStart: string,
) {
  const [{ data: players }, { data: answers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, pair_id")
      .not("pair_id", "is", null)
      .returns<{ id: string; pair_id: string }[]>(),
    supabase
      .from("player_availability")
      .select("profile_id, can_play")
      .eq("week_start", weekStart)
      .returns<{ profile_id: string; can_play: boolean }[]>(),
  ]);
  const yes = new Set((answers ?? []).filter((a) => a.can_play).map((a) => a.profile_id));
  const byPair = new Map<string, string[]>();
  for (const p of players ?? []) {
    byPair.set(p.pair_id, [...(byPair.get(p.pair_id) ?? []), p.id]);
  }
  return [...byPair.entries()]
    .filter(([, members]) => members.length === 2 && members.every((id) => yes.has(id)))
    .map(([pairId]) => pairId);
}

/** Jugadores activos que han dicho que pueden jugar esa semana (liga individual). */
export async function availablePlayerIds(supabase: SupabaseClient, weekStart: string) {
  const [{ data: players }, { data: answers }] = await Promise.all([
    supabase.from("profiles").select("id, active").returns<{ id: string; active?: boolean }[]>(),
    supabase
      .from("player_availability")
      .select("profile_id")
      .eq("week_start", weekStart)
      .eq("can_play", true)
      .returns<{ profile_id: string }[]>(),
  ]);
  const yes = new Set((answers ?? []).map((a) => a.profile_id));
  return (players ?? []).filter((p) => p.active !== false && yes.has(p.id)).map((p) => p.id);
}
