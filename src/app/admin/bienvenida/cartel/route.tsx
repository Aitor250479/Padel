import { renderPollPoster } from "@/lib/poll-poster";
import { loadPoll } from "@/lib/polls";
import { requireOrganizer } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cartel de la encuesta ?id= para compartir por WhatsApp (solo organizadores). */
export async function GET(request: Request) {
  const { supabase } = await requireOrganizer();
  const url = new URL(request.url);
  const poll = await loadPoll(supabase, url.searchParams.get("id"));
  if (!poll) return new Response("No hay encuesta", { status: 404 });
  return renderPollPoster(poll.poll, poll.options, url.host);
}
