"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLeagueAdmin } from "@/lib/session";

const HOME = "/admin/ligas";

function done(path: string, result?: { error?: { message: string } | null; ok?: string }) {
  revalidatePath("/", "layout");
  if (result?.error) redirect(`${path}?error=${encodeURIComponent(friendlyError(result.error.message))}`);
  if (result?.ok) redirect(`${path}?ok=${encodeURIComponent(result.ok)}`);
  redirect(path);
}

function text(formData: FormData, key: string, max = 60) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function kindOf(formData: FormData) {
  return formData.get("kind") === "individual" ? "individual" : "parejas";
}

type Client = Awaited<ReturnType<typeof requireLeagueAdmin>>["supabase"];

/** Crea una categoría con su primera temporada (sin jugadores todavía). */
async function insertCategory(supabase: Client, competitionId: string, name: string, season: string, kind: string) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ competition_id: competitionId, name })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: error ?? { message: "No se ha podido crear la categoría" } };
  const { error: seasonError } = await supabase
    .from("leagues")
    .insert({ name: season, kind, category_id: data.id });
  if (seasonError) {
    await supabase.from("categories").delete().eq("id", data.id);
    return { error: seasonError };
  }
  return { id: data.id };
}

export async function createCompetition(formData: FormData) {
  const { supabase, profile } = await requireLeagueAdmin();
  if (!profile.is_superadmin) return done(HOME, { error: { message: "Solo el superadmin crea ligas" } });
  const name = text(formData, "name");
  const category = text(formData, "category");
  const season = text(formData, "season") || "Temporada 1";
  if (!name || !category) return done(HOME, { error: { message: "Pon el nombre de la liga y de su primera categoría" } });

  const { data, error } = await supabase
    .from("competitions")
    .insert({ name })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return done(HOME, { error });
  const created = await insertCategory(supabase, data.id, category, season, kindOf(formData));
  if (created.error) {
    await supabase.from("competitions").delete().eq("id", data.id);
    return done(HOME, { error: created.error });
  }
  done(HOME, { ok: `Liga "${name}" creada con la categoría "${category}"` });
}

export async function renameCompetition(formData: FormData) {
  const { supabase } = await requireLeagueAdmin();
  const id = String(formData.get("id"));
  const name = text(formData, "name");
  if (!name) return done(HOME, { error: { message: "El nombre no puede estar vacío" } });
  const { data, error } = await supabase.from("competitions").update({ name }).eq("id", id).select("id");
  if (!error && !data?.length) return done(HOME, { error: { message: "Solo el superadmin cambia el nombre de una liga" } });
  done(HOME, error ? { error } : { ok: "Nombre de la liga cambiado" });
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireLeagueAdmin();
  const competitionId = String(formData.get("competition_id"));
  const name = text(formData, "name");
  const season = text(formData, "season") || "Temporada 1";
  if (!name) return done(HOME, { error: { message: "Pon un nombre a la categoría" } });
  const created = await insertCategory(supabase, competitionId, name, season, kindOf(formData));
  if (created.error) return done(HOME, { error: created.error });
  done(`${HOME}/categoria/${created.id}`, { ok: `Categoría "${name}" creada` });
}

export async function renameCategory(formData: FormData) {
  const { supabase } = await requireLeagueAdmin();
  const id = String(formData.get("id"));
  const path = `${HOME}/categoria/${id}`;
  const name = text(formData, "name");
  if (!name) return done(path, { error: { message: "El nombre no puede estar vacío" } });
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  done(path, error ? { error } : { ok: "Nombre de la categoría cambiado" });
}

export async function addLeagueAdmin(formData: FormData) {
  const { supabase, profile } = await requireLeagueAdmin();
  if (!profile.is_superadmin) return done(HOME, { error: { message: "Solo el superadmin nombra organizadores de liga" } });
  const competitionId = String(formData.get("competition_id"));
  const profileId = String(formData.get("profile_id") ?? "");
  if (!profileId) return done(HOME, { error: { message: "Elige un jugador" } });
  const { error } = await supabase
    .from("competition_admins")
    .upsert({ competition_id: competitionId, profile_id: profileId }, { ignoreDuplicates: true });
  done(HOME, error ? { error } : { ok: "Organizador de liga añadido" });
}

export async function removeLeagueAdmin(formData: FormData) {
  const { supabase, profile } = await requireLeagueAdmin();
  if (!profile.is_superadmin) return done(HOME, { error: { message: "Solo el superadmin quita organizadores de liga" } });
  const { error } = await supabase
    .from("competition_admins")
    .delete()
    .eq("competition_id", String(formData.get("competition_id")))
    .eq("profile_id", String(formData.get("profile_id")));
  done(HOME, error ? { error } : { ok: "Organizador de liga quitado" });
}
