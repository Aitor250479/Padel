// Sin imports de ejecución para poder probarlo con node directamente:
// los formatos de fecha llegan como funciones en `names`.
import type { Match } from "@/lib/matches";

/** Enlace que abre WhatsApp con el texto ya escrito (el usuario elige a quién mandarlo). */
export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export type Names = {
  pairName: (id: string) => string;
  playersOf: (id: string) => string;
  /** formatBooking de lib/matches */
  formatBooking: (at: string | null) => string | null;
  /** formatWeekLong de lib/weeks */
  formatWeekLong: (weekStart: string) => string;
};

function side(id: string, { pairName, playersOf }: Names) {
  const players = playersOf(id);
  return players ? `${pairName(id)} (${players})` : pairName(id);
}

function where(m: Pick<Match, "booking_place" | "booking_at">, names: Names) {
  const booking = names.formatBooking(m.booking_at);
  if (!booking) return null;
  return `${m.booking_place || "Lugar sin indicar"}, ${booking}`;
}

/** Mensaje con los partidos de una semana, para el grupo. */
export function weekMessage(weekStart: string, matches: Match[], names: Names, siteUrl: string) {
  const active = matches.filter((m) => m.status !== "cancelado");
  const lines = active.map((m) => {
    const place = where(m, names);
    return (
      `• ${side(m.pair_a, names)} vs ${side(m.pair_b, names)}\n` +
      `   ${place ? `📍 ${place}` : "⏳ Falta reservar pista"}`
    );
  });
  return [
    `🎾 *Torneo Pádel Loyola*`,
    `Partidos de la semana del ${names.formatWeekLong(weekStart)}:`,
    "",
    ...lines,
    "",
    `Reservad pista y apuntad lugar, fecha y hora en la web: ${siteUrl}/partidos?semana=${weekStart}`,
  ].join("\n");
}

/** Mensaje de una pareja a su rival sobre su partido. */
export function matchMessage(m: Match, myPair: string | null, names: Names, siteUrl: string) {
  const rival = m.pair_a === myPair ? m.pair_b : m.pair_b === myPair ? m.pair_a : null;
  const place = where(m, names);
  return [
    `🎾 *Torneo Pádel Loyola*`,
    `${names.pairName(m.pair_a)} vs ${names.pairName(m.pair_b)} · semana del ${names.formatWeekLong(m.week_start)}`,
    "",
    place
      ? `📍 ${place}`
      : rival
        ? `Todavía no tenemos pista. ¿Qué día y hora os viene bien${names.playersOf(rival) ? `, ${names.playersOf(rival)}` : ""}?`
        : "Todavía no hay pista reservada.",
    "",
    `Detalles del partido: ${siteUrl}/partidos/${m.id}`,
  ].join("\n");
}
