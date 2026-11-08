import { renderInvitePoster } from "@/lib/invite-poster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cartel de la invitación a nuevos jugadores, para compartir por WhatsApp. */
export async function GET(request: Request) {
  return renderInvitePoster(new URL(request.url).host);
}
