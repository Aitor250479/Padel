import type { SupabaseClient } from "@supabase/supabase-js";

/** Invitación: de una categoría (entra en ella) o de una liga (queda pendiente de categoría). */
export type InviteInfo = { kind: "categoria" | "liga"; competition_name: string; category_name: string | null };

export function cleanInviteCode(code: string | null | undefined) {
  const c = (code ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}$/.test(c) ? c : null;
}

export async function loadInvite(supabase: SupabaseClient, code: string | null | undefined) {
  const clean = cleanInviteCode(code);
  if (!clean) return null;
  const { data } = await supabase.rpc("invite_info", { code: clean }).maybeSingle<InviteInfo>();
  return data ? { code: clean, ...data } : null;
}

export function inviteTitle(invite: Pick<InviteInfo, "competition_name" | "category_name">) {
  return invite.category_name ? `${invite.competition_name} · ${invite.category_name}` : invite.competition_name;
}

/** Texto del WhatsApp de la invitación. */
export function inviteMessage(link: string, competition: string) {
  return `🎾 *¡Únete a ${competition}!* 🎾\nBuscamos nuevos jugadores. Crea tu usuario en un minuto y, al entrar, marca cuándo puedes jugar: el sorteo se encarga del resto 😎\n👉 ${link}`;
}
