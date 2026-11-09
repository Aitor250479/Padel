import { renderPollResultPoster } from "@/lib/poll-poster";
import { POLL_KEY, loadPoll, pollOpen, pollResults } from "@/lib/polls";
import { requireOrganizer } from "@/lib/session";
import { nowInSpain } from "@/lib/weeks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cartel con el resultado de una encuesta ya cerrada (solo organizadores):
 * la de ?id= o, si no se indica, la encuesta actual.
 */
export async function GET(request: Request) {
  const { supabase } = await requireOrganizer();
  let id = new URL(request.url).searchParams.get("id");
  if (!id) {
    const { data: row } = await supabase.from("site_texts").select("body").eq("key", POLL_KEY).maybeSingle();
    id = row?.body ?? null;
  }
  const poll = await loadPoll(supabase, id);
  if (!poll) return new Response("No hay encuesta", { status: 404 });
  if (pollOpen(poll.poll, nowInSpain())) return new Response("La encuesta sigue abierta", { status: 409 });
  const { rows, total } = pollResults(poll.options, poll.votes);
  if (!total) return new Response("Nadie ha votado", { status: 409 });
  return renderPollResultPoster(poll.poll, rows, total);
}
