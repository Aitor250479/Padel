"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/errors";
import { LEVEL_QUESTIONS, formatLevel, validAnswers } from "@/lib/level";
import { requireOrganizer, requireProfile } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(target: string, me: string, key: "ok" | "error", text: string): never {
  const base = target === me ? "/nivel" : `/nivel?jugador=${target}`;
  redirect(`${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(text)}`);
}

export async function saveLevelForm(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const raw = String(formData.get("target") ?? "");
  const target = UUID.test(raw) ? raw : profile.id;
  const answers = LEVEL_QUESTIONS.map((_, i) => {
    const v = formData.get(`q${i}`);
    return v === null || v === "" ? -1 : Number(v);
  });
  if (!validAnswers(answers)) back(target, profile.id, "error", "Contesta todas las preguntas.");
  const { data, error } = await supabase.rpc("save_level_form", { target, answers });
  if (error) back(target, profile.id, "error", friendlyError(error.message));
  revalidatePath("/", "layout");
  back(
    target,
    profile.id,
    "ok",
    `Formulario guardado. Nivel inicial: ${formatLevel(Number(data))}. A partir de aquí lo van moviendo los partidos oficiales.`,
  );
}

export async function setInitialLevel(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const target = String(formData.get("target") ?? "");
  if (!UUID.test(target)) redirect("/admin/parejas");
  const level = Number(String(formData.get("level") ?? "").trim().replace(",", "."));
  if (!Number.isFinite(level) || level < 1 || level > 10) {
    back(target, profile.id, "error", "El nivel inicial tiene que estar entre 1,00 y 10.");
  }
  const { error } = await supabase.rpc("set_initial_level", { target, level: Math.round(level * 100) / 100 });
  if (error) back(target, profile.id, "error", friendlyError(error.message));
  revalidatePath("/", "layout");
  back(target, profile.id, "ok", `Nivel inicial cambiado a ${formatLevel(level)}.`);
}
