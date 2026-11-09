import { renderPollResultPoster } from "@/lib/poll-poster";
import { loadPoll, pollOpen, pollResults } from "@/lib/polls";
import { requireOrganizer } from "@/lib/session";
import { nowInSpain } from "@/lib/weeks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cartel con el resultado de la encuesta ?id=, ya cerrada (solo organizadores).
 */
export async function GET(request: Request) {
  const { supabase } = await requireOrganizer();
  const poll = await loadPoll(supabase, new URL(request.url).searchParams.get("id"));
  if (!poll) return new Response("No hay encuesta", { status: 404 });
  if (pollOpen(poll.poll, nowInSpain())) return new Response("La encuesta sigue abierta", { status: 409 });
  const { rows, total } = pollResults(poll.options, poll.votes);
  if (!total) return new Response("Nadie ha votado", { status: 409 });
  return renderPollResultPoster(poll.poll, rows, total);
}
