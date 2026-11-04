import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  is_organizer: boolean;
  pair_id: string | null;
};

export type Pair = { id: string; name: string };

/** Usuario conectado y su perfil. Redirige a /login si no hay sesión. */
export async function requireProfile() {
  const supabase = await createClient();
  // La sesión ya se ha validado en el middleware; aquí basta con leer el
  // token (validación local, sin viaje a Supabase si hay claves asimétricas).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_organizer, pair_id")
    .eq("id", userId)
    .single<Profile>();
  if (!profile) redirect("/login");

  return { supabase, profile };
}

export async function requireOrganizer() {
  const ctx = await requireProfile();
  if (!ctx.profile.is_organizer) redirect("/");
  return ctx;
}

export function displayName(p: Pick<Profile, "full_name" | "email">) {
  return p.full_name?.trim() || p.email.split("@")[0];
}
