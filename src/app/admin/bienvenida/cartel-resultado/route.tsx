import { renderPollResultPoster } from "@/lib/poll-poster";
import { POLL_KEY, loadPoll, pollOpen, pollResults } from "@/lib/polls";
import { requireOrganizer } from "@/lib/session";
import { nowInSpain } from "@/lib/weeks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cartel con el resultado de la encuesta actual, ya cerrada (solo organizadores). */
export async function GET() {
  const { supabase } = await requireOrganizer();
  const { data: row } = await supabase.from("site_texts").select("body").eq("key", POLL_KEY).maybeSingle();
  const current = await loadPoll(supabase, row?.body);
  if (!current) return new Response("No hay encuesta", { status: 404 });
  if (pollOpen(current.poll, nowInSpain())) return new Response("La encuesta sigue abierta", { status: 409 });
  const { rows, total } = pollResults(current.options, current.votes);
  if (!total) return new Response("Nadie ha votado", { status: 409 });
  return renderPollResultPoster(current.poll, rows, total);
}
