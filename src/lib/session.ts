import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  is_organizer: boolean;
  pair_id: string | null;
  /** false si un organizador lo ha desactivado (undefined antes de la migración 013). */
  active?: boolean;
  /** Eliminado: ya no tiene cuenta, pero se conserva su historia (migración 016). */
  deleted_at?: string | null;
  /** Superadmin: crea ligas y categorías (migración 023). */
  is_superadmin?: boolean;
  /** Categoría del jugador; vacía = pendiente de categoría (migración 023). */
  category_id?: string | null;
};

export type Pair = {
  id: string;
  name: string;
  /** Solo en las parejas de una liga individual (migración 014). */
  league_id?: string | null;
  player_1?: string | null;
  player_2?: string | null;
};

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
    .select("*")
    .eq("id", userId)
    .single<Profile>();
  if (!profile) redirect("/login");
  // Un desactivado puede entrar a consultar; uno eliminado ya no tiene cuenta.
  if (profile.deleted_at) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Tu cuenta ya no existe. Habla con un organizador.")}`);
  }

  return { supabase, profile };
}

export async function requireOrganizer() {
  const ctx = await requireProfile();
  if (!ctx.profile.is_organizer) redirect("/");
  return ctx;
}

/** ¿Puede nombrar organizadores? Solo el superadmin y los organizadores de liga (migración 024). */
export async function canNameOrganizers(supabase: Awaited<ReturnType<typeof createClient>>, profile: Profile) {
  if (profile.is_superadmin) return true;
  const { data, error } = await supabase.rpc("is_any_league_admin");
  // Antes de la migración 024 la función no existe: como hasta ahora, cualquier organizador.
  if (error) return profile.is_organizer;
  return data === true;
}

export function displayName(p: Pick<Profile, "full_name" | "email">) {
  return p.full_name?.trim() || p.email.split("@")[0];
}
