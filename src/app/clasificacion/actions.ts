"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";

function back(params: Record<string, string>) {
  revalidatePath("/", "layout");
  redirect(`/clasificacion?${new URLSearchParams(params)}`);
}

export async function startNewLeague(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const word = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (!name) return back({ error: "Ponle un nombre a la nueva liga." });
  if (word !== "REINICIAR") return back({ error: "Escribe REINICIAR para confirmar." });
  const { error } = await supabase.rpc("start_new_league", { new_name: name });
  if (error) return back({ error: error.message });
  back({ ok: `¡Empieza "${name}"! La liga anterior queda guardada en Ligas anteriores.` });
}

export async function renameLeague(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return back({ error: "El nombre no puede estar vacío." });
  const { error } = await supabase.from("leagues").update({ name }).eq("id", id);
  back(error ? { error: error.message } : { ok: "Nombre de la liga cambiado." });
}
