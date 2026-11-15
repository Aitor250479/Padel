import { renderInvitePoster } from "@/lib/invite-poster";
import { loadInvite } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cartel de la invitación a nuevos jugadores, para compartir por WhatsApp (?c=código). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const info = await loadInvite(await createClient(), url.searchParams.get("c"));
  return renderInvitePoster(url.host, info?.code, info?.competition_name);
}
