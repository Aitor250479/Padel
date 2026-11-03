import type { SupabaseClient } from "@supabase/supabase-js";
import { displayName, type Pair, type Profile } from "@/lib/session";

export type Match = {
  id: string;
  week_start: string;
  pair_a: string;
  pair_b: string;
  slot_day: string | null;
  slot_hour: number | null;
  booking_place: string | null;
  booking_at: string | null;
  status: "programado" | "jugado" | "cancelado";
  sets_a: number | null;
  sets_b: number | null;
  score_detail: string | null;
};

export const MATCH_COLUMNS =
  "id, week_start, pair_a, pair_b, slot_day, slot_hour, booking_place, booking_at, status, sets_a, sets_b, score_detail";

/** Nombres de parejas y de sus jugadores, para mostrar partidos. */
export async function loadPairDirectory(supabase: SupabaseClient) {
  const [{ data: pairs }, { data: players }] = await Promise.all([
    supabase.from("pairs").select("id, name").order("name").returns<Pair[]>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, pair_id")
      .returns<Profile[]>(),
  ]);
  const pairName = (id: string) => pairs?.find((p) => p.id === id)?.name ?? "Pareja borrada";
  const playersOf = (id: string) =>
    (players ?? [])
      .filter((p) => p.pair_id === id)
      .map((p) => displayName(p))
      .join(" y ");
  return { pairs: pairs ?? [], pairName, playersOf };
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function formatSlot(day: string | null, hour: number | null) {
  if (!day || hour === null) return "Sin franja";
  const d = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1} a las ${hour}:00`;
}

/** booking_at viene como "YYYY-MM-DDTHH:MM:SS" (hora local, sin zona). */
export function formatBooking(at: string | null) {
  if (!at) return null;
  const [day, time] = at.split("T");
  const d = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1} a las ${time.slice(0, 5)}`;
}

/** "Los Toros 2-1 Smash (6-4 3-6 7-5)" o null si no hay resultado. */
export function formatResult(m: Match, pairName: (id: string) => string) {
  if (m.sets_a === null || m.sets_b === null) return null;
  const base = `${pairName(m.pair_a)} ${m.sets_a}-${m.sets_b} ${pairName(m.pair_b)}`;
  const tie = m.sets_a === m.sets_b ? " · sin terminar, empate" : "";
  return base + (m.score_detail ? ` (${m.score_detail})` : "") + tie;
}

export type ProposedResult = {
  match_id: string;
  pair_id: string;
  sets_a: number;
  sets_b: number;
  score_detail: string | null;
};

export const PROPOSED_COLUMNS = "match_id, pair_id, sets_a, sets_b, score_detail";

/**
 * ¿Se puede introducir ya el resultado? Cuando ha pasado la fecha y hora de la
 * reserva. Si no se apuntó reserva, cuando ha terminado la semana del partido.
 */
export function resultOpen(m: Match, now: string) {
  if (m.booking_at) return now >= m.booking_at.slice(0, 16);
  const end = new Date(`${m.week_start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  return now >= end.toISOString().slice(0, 10);
}

/** Texto del estado del resultado para la lista y la ficha. */
export function resultStatus(
  m: Match,
  proposals: ProposedResult[],
  pairName: (id: string) => string,
): { tone: "ok" | "pending" | "warn"; text: string } {
  const confirmed = formatResult(m, pairName);
  if (confirmed) return { tone: "ok", text: confirmed };
  const mine = proposals.filter((p) => p.match_id === m.id);
  if (mine.length === 0) return { tone: "pending", text: "Falta introducir el resultado" };
  if (mine.length === 1) {
    const other = mine[0].pair_id === m.pair_a ? m.pair_b : m.pair_a;
    return {
      tone: "pending",
      text: `${pairName(mine[0].pair_id)} ha introducido el resultado. Falta la confirmación de ${pairName(other)}`,
    };
  }
  return {
    tone: "warn",
    text: "Las dos parejas han puesto resultados distintos. Hay que ponerse de acuerdo y corregirlo",
  };
}
