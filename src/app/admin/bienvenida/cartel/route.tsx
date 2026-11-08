import { renderPollPoster } from "@/lib/poll-poster";
import { POLL_KEY, loadPoll } from "@/lib/polls";
import { requireOrganizer } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cartel de la encuesta actual para compartir por WhatsApp (solo organizadores). */
export async function GET(request: Request) {
  const { supabase } = await requireOrganizer();
  const { data: row } = await supabase.from("site_texts").select("body").eq("key", POLL_KEY).maybeSingle();
  const current = await loadPoll(supabase, row?.body);
  if (!current) return new Response("No hay encuesta", { status: 404 });
  return renderPollPoster(current.poll, current.options, new URL(request.url).host);
}
