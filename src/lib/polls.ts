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
