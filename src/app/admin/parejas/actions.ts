"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";

function done(error?: { message: string } | null) {
  revalidatePath("/", "layout");
  if (error) redirect(`/admin/parejas?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/parejas");
}

export async function createPair(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return done({ message: "Pon un nombre a la pareja" });
  const { error } = await supabase.from("pairs").insert({ name });
  done(error);
}

export async function renamePair(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return done({ message: "El nombre no puede estar vacío" });
  const { error } = await supabase.from("pairs").update({ name }).eq("id", id);
  done(error);
}

export async function deletePair(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const { error } = await supabase.from("pairs").delete().eq("id", String(formData.get("id")));
  done(error);
}

export async function assignPlayer(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const playerId = String(formData.get("player_id"));
  const pairId = String(formData.get("pair_id") ?? "");
  const { error } = await supabase
    .from("profiles")
    .update({ pair_id: pairId || null })
    .eq("id", playerId);
  done(error);
}

export async function toggleOrganizer(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const playerId = String(formData.get("player_id"));
  if (playerId === profile.id) return done({ message: "No puedes quitarte el rol a ti mismo" });
  const makeOrganizer = formData.get("value") === "true";
  const { error } = await supabase
    .from("profiles")
    .update({ is_organizer: makeOrganizer })
    .eq("id", playerId);
  done(error);
}
