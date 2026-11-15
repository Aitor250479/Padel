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
  /** Pendiente de categoría: liga en la que espera (migración 028). */
  pending_competition_id?: string | null;
  /** Ligas que organiza (no es columna: se rellena en requireProfile, migración 024). */
  league_admin_of?: string[];
  /** Categoría que está viendo: la suya, o la que gestiona un organizador de liga (migración 025). */
  active_category?: ActiveCategory | null;
};

export type ActiveCategory = { id: string; name: string; competition_id: string; competition_name: string };

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

  const [{ data: profile }, { data: leagueAdmin }, { data: category }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single<Profile>(),
    // Antes de las migraciones 024 y 025 no existen: quedan vacíos.
    supabase.from("competition_admins").select("competition_id").eq("profile_id", userId),
    supabase.rpc("active_category").maybeSingle<ActiveCategory>(),
  ]);
  if (!profile) redirect("/login");
  profile.league_admin_of = (leagueAdmin ?? []).map((r: { competition_id: string }) => r.competition_id);
  profile.active_category = category ?? null;
  // Un organizador de liga es organizador de cualquier categoría de su liga.
  if (isLeagueAdmin(profile) && profile.active !== false) profile.is_organizer = true;
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

/** Superadmin u organizador de alguna liga: gestiona ligas y categorías, nombra organizadores. */
export function isLeagueAdmin(profile: Profile) {
  return !!profile.is_superadmin || (profile.league_admin_of?.length ?? 0) > 0;
}

export async function requireLeagueAdmin() {
  const ctx = await requireProfile();
  if (!isLeagueAdmin(ctx.profile) || ctx.profile.active === false) redirect("/");
  return ctx;
}

export function displayName(p: Pick<Profile, "full_name" | "email">) {
  return p.full_name?.trim() || p.email.split("@")[0];
}

/** Dado de alta con la invitación genérica de una liga: espera a que le den categoría. */
export function isPendingCategory(profile: Profile) {
  return !profile.category_id && !isLeagueAdmin(profile);
}
