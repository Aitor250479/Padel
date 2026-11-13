import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FRIENDLY_COLUMNS,
  FRIENDLY_PLAYER_COLUMNS,
  type FriendlyMatch,
  type FriendlyPlayer,
} from "@/lib/friendlies";
import { displayName, type Profile } from "@/lib/session";

/** Amistosos (desde `since`, "YYYY-MM-DDTHH:MM", si se indica) con sus apuntados. */
export async function loadFriendlies(supabase: SupabaseClient, opts: { since?: string; limit?: number } = {}) {
  let q = supabase.from("friendly_matches").select(FRIENDLY_COLUMNS);
  if (opts.since) q = q.gte("play_at", opts.since);
  const { data: matches } = await q
    .order("play_at", { ascending: false })
    .limit(opts.limit ?? 300)
    .returns<FriendlyMatch[]>();
  const ids = (matches ?? []).map((m) => m.id);
  const { data: players } = ids.length
    ? await supabase
        .from("friendly_players")
        .select(FRIENDLY_PLAYER_COLUMNS)
        .in("match_id", ids)
        .returns<FriendlyPlayer[]>()
    : { data: [] as FriendlyPlayer[] };
  return { matches: matches ?? [], players: players ?? [] };
}

/** Nombres de todos los jugadores, para los amistosos. */
export async function loadPeople(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_organizer, pair_id, active, deleted_at")
    .returns<Profile[]>();
  const people = data ?? [];
  const nameOf = (id: string | null) => {
    if (!id) return "";
    const p = people.find((x) => x.id === id);
    return p ? displayName(p) : "Jugador borrado";
  };
  return { people, nameOf };
}
