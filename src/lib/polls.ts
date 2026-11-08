import type { SupabaseClient } from "@supabase/supabase-js";

export const POLL_KEY = "encuesta_actual";

export type Poll = { id: string; question: string; closes_at: string };
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

/**
 * La encuesta del inicio con sus opciones y los votos que puede ver este
 * jugador: el suyo mientras está abierta, todos cuando ya se ha cerrado.
 */
export async function loadPoll(supabase: SupabaseClient, pollId: string | null | undefined) {
  if (!pollId) return null;
  const [{ data: poll }, { data: options }, { data: votes }] = await Promise.all([
    supabase.from("polls").select("id, question, closes_at").eq("id", pollId).maybeSingle<Poll>(),
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
