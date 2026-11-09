import type { SupabaseClient } from "@supabase/supabase-js";

export type Poll = { id: string; question: string; closes_at: string; result_hours: number };

export const POLL_COLUMNS = "id, question, closes_at, result_hours";

/** Opciones del desplegable "Mostrar el resultado … tras el cierre". */
export const RESULT_HOURS = [
  { hours: 12, label: "12 horas" },
  { hours: 24, label: "24 horas" },
  { hours: 48, label: "48 horas" },
  { hours: 72, label: "3 días" },
  { hours: 168, label: "1 semana" },
];

/** Suma horas a una hora local "YYYY-MM-DDTHH:MM[:SS]" y devuelve "YYYY-MM-DDTHH:MM". */
export function addHoursLocal(local: string, hours: number) {
  const [d, t = "00:00"] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, da, h + hours, mi)).toISOString().slice(0, 16);
}

/** Hasta cuándo se enseña el resultado de la encuesta en el inicio. */
export function pollResultUntil(poll: Pick<Poll, "closes_at" | "result_hours">) {
  return addHoursLocal(poll.closes_at, poll.result_hours ?? 48);
}

/** ¿Sale la encuesta en el inicio? Mientras está abierta y el tiempo elegido tras el cierre. */
export function pollOnHome(poll: Pick<Poll, "closes_at" | "result_hours">, now: string) {
  return now.slice(0, 16) < pollResultUntil(poll);
}

export type PollTodo = {
  tone: "action" | "info";
  icon: string;
  title: string;
  text: string;
  href: string;
};

/** Tarjeta de la encuesta para el inicio de un jugador. */
export function pollTodo(
  poll: Poll,
  i: { now: string; voted: boolean; canVote: boolean; formatBooking: (at: string) => string | null },
): PollTodo | null {
  if (!pollOnHome(poll, i.now)) return null;
  const href = `/encuesta/${poll.id}`;
  const closes = i.formatBooking(poll.closes_at);
  if (!pollOpen(poll, i.now)) {
    return { tone: "info", icon: "📊", title: "Ya está el resultado de la encuesta", text: `${poll.question} · Toca para verlo`, href };
  }
  if (!i.canVote) {
    return { tone: "info", icon: "🗳️", title: "Encuesta abierta", text: `${poll.question} · Cierra el ${closes}`, href };
  }
  if (i.voted) {
    return {
      tone: "info",
      icon: "🗳️",
      title: "Ya has votado en la encuesta",
      text: `${poll.question} · Puedes cambiar tu voto hasta el ${closes}`,
      href,
    };
  }
  return { tone: "action", icon: "🗳️", title: "Encuesta abierta: ¡aún no has votado!", text: `${poll.question} · Cierra el ${closes}`, href };
}
export type PollOption = { id: string; poll_id: string; position: number; label: string };
export type PollVote = { profile_id: string; option_id: string };

/** closes_at viene como "YYYY-MM-DDTHH:MM:SS" (hora de Madrid); now como "YYYY-MM-DDTHH:MM". */
export function pollOpen(poll: Pick<Poll, "closes_at">, now: string) {
  return now < poll.closes_at.slice(0, 16);
}

/** Recuento de votos por opción, en el orden de las opciones. */
export function pollResults(options: PollOption[], votes: PollVote[]) {
  const total = votes.length;
  const rows = [...options]
    .sort((a, b) => a.position - b.position)
    .map((o) => {
      const count = votes.filter((v) => v.option_id === o.id).length;
      return { ...o, count, percent: total ? Math.round((count / total) * 100) : 0 };
    });
  const max = Math.max(0, ...rows.map((r) => r.count));
  return { total, rows: rows.map((r) => ({ ...r, winner: max > 0 && r.count === max })) };
}

/** Texto que acompaña al cartel del resultado (sin enlaces). */
export function pollResultText(question: string, results: ReturnType<typeof pollResults>) {
  const winners = results.rows.filter((r) => r.winner);
  const head =
    winners.length > 1
      ? `🤝 Empate entre ${winners.map((r) => `*${r.label}*`).join(" y ")} con un ${winners[0].percent}% cada una`
      : `🏆 Gana *${winners[0].label}* con un ${winners[0].percent}% de los votos`;
  const lines = [...results.rows]
    .sort((a, b) => b.count - a.count)
    .map((r) => `${r.winner ? "🥇" : "▫️"} ${r.label}: ${r.percent}%`);
  const votes = `${results.total} ${results.total === 1 ? "voto" : "votos"}`;
  return [`🗳️ *Resultado de la encuesta del Torneo Pádel Loyola*`, `*${question}*`, head, "", ...lines, "", votes].join("\n");
}

/**
 * Una encuesta con sus opciones y los votos que puede ver este jugador: el
 * suyo mientras está abierta, todos cuando ya se ha cerrado.
 */
export async function loadPoll(supabase: SupabaseClient, pollId: string | null | undefined) {
  if (!pollId) return null;
  const [{ data: poll }, { data: options }, { data: votes }] = await Promise.all([
    supabase.from("polls").select(POLL_COLUMNS).eq("id", pollId).maybeSingle<Poll>(),
    supabase.from("poll_options").select("id, poll_id, position, label").eq("poll_id", pollId).order("position").returns<PollOption[]>(),
    supabase.from("poll_votes").select("profile_id, option_id").eq("poll_id", pollId).returns<PollVote[]>(),
  ]);
  if (!poll) return null;
  return { poll, options: options ?? [], votes: votes ?? [] };
}

/**
 * Instante (milisegundos) de una hora local de Madrid "YYYY-MM-DDTHH:MM[:SS]",
 * teniendo en cuenta el horario de verano.
 */
export function madridToEpoch(local: string) {
  const [d, t = "00:00:00"] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi, s = 0] = t.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, da, h, mi, s);
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Madrid",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(ms));
    const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - ms;
  };
  let epoch = asUtc - offsetAt(asUtc);
  epoch = asUtc - offsetAt(epoch);
  return epoch;
}

/** Días, horas, minutos y segundos que faltan (nunca negativos). */
export function countdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
