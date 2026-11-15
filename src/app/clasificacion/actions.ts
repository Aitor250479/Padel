"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";

function back(params: Record<string, string>) {
  revalidatePath("/", "layout");
  redirect(`/clasificacion?${new URLSearchParams(params)}`);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Fin de temporada: cierra la actual y prepara la siguiente con su fecha de inicio. */
export async function startNewLeague(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const word = String(formData.get("confirm") ?? "").trim().toUpperCase();
  const start = String(formData.get("start") ?? "");
  if (!name) return back({ error: "Ponle un nombre a la nueva temporada." });
  if (word !== "TERMINAR") return back({ error: "Escribe TERMINAR para confirmar." });
  if (!DATE.test(start)) return back({ error: "Elige la fecha de inicio de la nueva temporada." });
  const kind = formData.get("kind") === "individual" ? "individual" : "parejas";
  const { error } = await supabase.rpc("start_new_league", { new_name: name, new_kind: kind, new_start: start });
  if (error) return back({ error: friendlyError(error.message) });
  back({
    ok: `Temporada terminada. "${name}" (${kind === "individual" ? "individual" : "por parejas"}) empieza el día que has elegido; la anterior queda en Ligas anteriores.`,
  });
}

/** Durante el descanso: nombre, tipo y fecha de inicio de la temporada que viene. */
export async function updateNextSeason(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const start = String(formData.get("start") ?? "");
  if (!DATE.test(start)) return back({ error: "Elige la fecha de inicio." });
  const { error } = await supabase.rpc("update_next_season", {
    season: String(formData.get("id")),
    new_name: String(formData.get("name") ?? "").trim().slice(0, 60),
    new_kind: formData.get("kind") === "individual" ? "individual" : "parejas",
    new_start: start,
  });
  back(error ? { error: friendlyError(error.message) } : { ok: "Temporada que viene guardada." });
}

export async function renameLeague(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return back({ error: "El nombre no puede estar vacío." });
  const { error } = await supabase.from("leagues").update({ name }).eq("id", id);
  back(error ? { error: friendlyError(error.message) } : { ok: "Nombre de la liga cambiado." });
}
