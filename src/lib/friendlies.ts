// Partidos amistosos. Sin imports de ejecución para poder probarlo con node.
import type { StatMatch, StatPlayer } from "@/lib/player-stats";
import type { Todo } from "@/lib/todo";

export type FriendlyMatch = {
  id: string;
  /** Hora local de Madrid, "YYYY-MM-DDTHH:MM:SS" (sin zona), como booking_at. */
  play_at: string;
  place: string | null;
  sets_a: number | null;
  sets_b: number | null;
  score_detail: string | null;
  created_by: string | null;
  created_at: string;
};

export type Side = "a" | "b";

export type FriendlyPlayer = { match_id: string; profile_id: string; side: Side; slot: number };

export const FRIENDLY_COLUMNS = "id, play_at, place, sets_a, sets_b, score_detail, created_by, created_at";
export const FRIENDLY_PLAYER_COLUMNS = "match_id, profile_id, side, slot";

/** Los 4 huecos de un amistoso: 2 por pareja. */
export const SLOTS: { side: Side; slot: number }[] = [
  { side: "a", slot: 1 },
  { side: "a", slot: 2 },
  { side: "b", slot: 1 },
  { side: "b", slot: 2 },
];

/** Días que se ven en el inicio los amistosos ya jugados. */
export const RECENT_DAYS = 14;

/**
 * abierto: aún no se ha jugado y queda algún hueco libre.
 * confirmado: aún no se ha jugado y están los 4.
 * jugado: ha pasado la hora y estaban los 4 (con o sin resultado).
 * no_jugado: ha pasado la hora y no llegaron a ser 4.
 */
export type FriendlyState = "abierto" | "confirmado" | "jugado" | "no_jugado";

export const playersIn = (m: Pick<FriendlyMatch, "id">, players: FriendlyPlayer[]) =>
  players.filter((p) => p.match_id === m.id);

export const started = (m: Pick<FriendlyMatch, "play_at">, now: string) => now >= m.play_at.slice(0, 16);

export function friendlyState(m: FriendlyMatch, players: FriendlyPlayer[], now: string): FriendlyState {
  const full = playersIn(m, players).length >= 4;
  if (!started(m, now)) return full ? "confirmado" : "abierto";
  return full ? "jugado" : "no_jugado";
}

export const hasResult = (m: Pick<FriendlyMatch, "sets_a" | "sets_b">) => m.sets_a !== null && m.sets_b !== null;

/** Quién ocupa cada hueco: { a: [id|null, id|null], b: [...] }. */
export function lineup(m: Pick<FriendlyMatch, "id">, players: FriendlyPlayer[]) {
  const inMatch = playersIn(m, players);
  const at = (side: Side, slot: number) =>
    inMatch.find((p) => p.side === side && p.slot === slot)?.profile_id ?? null;
  return { a: [at("a", 1), at("a", 2)], b: [at("b", 1), at("b", 2)] };
}

export const missing = (m: Pick<FriendlyMatch, "id">, players: FriendlyPlayer[]) =>
  Math.max(0, 4 - playersIn(m, players).length);

/** "YYYY-MM-DDTHH:MM" de hace `days` días respecto a `now` (misma forma). */
export function daysBefore(now: string, days: number) {
  const d = new Date(`${now.slice(0, 16)}:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 16);
}

/**
 * Los tres carruseles del inicio. Los que faltan por jugar, del más cercano al
 * más lejano; los jugados (últimos RECENT_DAYS días), del más reciente al más antiguo.
 */
export function homeFriendlies(matches: FriendlyMatch[], players: FriendlyPlayer[], now: string) {
  const byDate = [...matches].sort((x, y) => x.play_at.localeCompare(y.play_at));
  const state = (m: FriendlyMatch) => friendlyState(m, players, now);
  const since = daysBefore(now, RECENT_DAYS);
  return {
    open: byDate.filter((m) => state(m) === "abierto"),
    confirmed: byDate.filter((m) => state(m) === "confirmado"),
    played: byDate.filter((m) => state(m) === "jugado" && m.play_at.slice(0, 16) >= since).reverse(),
  };
}

/**
 * Amistosos con resultado en el formato de las estadísticas de liga. Cada
 * pareja del amistoso es una pareja "virtual" (id del partido + lado) y la
 * liga es "amistosos".
 */
export const FRIENDLY_LEAGUE = "amistosos";

export function friendlyStatRows(matches: FriendlyMatch[], players: FriendlyPlayer[]) {
  const done = matches.filter((m) => hasResult(m) && playersIn(m, players).length === 4);
  const pair = (id: string, side: Side) => `${id}:${side}`;
  return {
    matches: done.map(
      (m): StatMatch => ({
        id: m.id,
        league_id: FRIENDLY_LEAGUE,
        week_start: m.play_at,
        pair_a: pair(m.id, "a"),
        pair_b: pair(m.id, "b"),
        sets_a: m.sets_a!,
        sets_b: m.sets_b!,
        score_detail: m.score_detail,
      }),
    ),
    players: done.flatMap((m) =>
      playersIn(m, players).map(
        (p): StatPlayer => ({ match_id: m.id, profile_id: p.profile_id, pair_id: pair(m.id, p.side) }),
      ),
    ),
  };
}

/** Tarjetas del inicio para un jugador: amistosos próximos y resultados por poner. */
export function friendlyTodos(
  me: string,
  matches: FriendlyMatch[],
  players: FriendlyPlayer[],
  now: string,
  formatBooking: (at: string | null) => string | null,
): Todo[] {
  const since = daysBefore(now, RECENT_DAYS);
  const mine = [...matches]
    .filter((m) => playersIn(m, players).some((p) => p.profile_id === me))
    .sort((x, y) => x.play_at.localeCompare(y.play_at));
  const todos: Todo[] = [];
  for (const m of mine) {
    const state = friendlyState(m, players, now);
    const href = `/amistosos/${m.id}`;
    const when = formatBooking(m.play_at) ?? "";
    if (state === "jugado" && !hasResult(m) && m.play_at.slice(0, 16) >= since) {
      todos.push({ tone: "action", icon: "📝", title: "Pon el resultado de tu amistoso", text: `Amistoso del ${when}.`, href, brief: true });
    } else if (state === "abierto" || state === "confirmado") {
      const left = missing(m, players);
      todos.push({
        tone: "info",
        icon: "🤝",
        title: `Tienes un amistoso el ${when}`,
        text: left ? `${left === 1 ? "Falta 1 jugador" : `Faltan ${left} jugadores`}.` : "Estáis los 4: ¡confirmado!",
        href,
      });
    }
  }
  // Primero lo que hay que hacer.
  return todos.sort((x, y) => Number(x.tone !== "action") - Number(y.tone !== "action"));
}

/** Mensaje de WhatsApp para animar a apuntarse o para recordar el partido. */
export function friendlyMessage(
  m: FriendlyMatch,
  players: FriendlyPlayer[],
  nameOf: (id: string) => string,
  formatBooking: (at: string | null) => string | null,
  url: string,
) {
  const l = lineup(m, players);
  const left = missing(m, players);
  const names = (ids: (string | null)[]) => ids.filter((x): x is string => !!x).map(nameOf);
  const when = `📅 ${formatBooking(m.play_at)}`;
  const where = m.place ? `📍 ${m.place}` : null;
  if (left > 0) {
    const signed = names([...l.a, ...l.b]);
    return [
      `🎾 ¡${left === 1 ? "Falta 1 jugador" : `Faltan ${left} jugadores`} para un amistoso!`,
      when,
      where,
      signed.length ? `Apuntados: ${signed.join(", ")}` : null,
      "",
      `¡Apúntate aquí! ${url}`,
    ]
      .filter((x) => x !== null)
      .join("\n");
  }
  return [
    "🎾 Amistoso confirmado",
    `${names(l.a).join(" y ")} vs ${names(l.b).join(" y ")}`,
    when,
    where,
    "",
    url,
  ]
    .filter((x) => x !== null)
    .join("\n");
}
