"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";
import { HOME_MODE_KEY, WELCOME_KEY, type HomeMode } from "@/lib/welcome";

const PATH = "/admin/bienvenida";

function done(params: { ok?: string; error?: string }) {
  revalidatePath("/", "layout");
  const [key, value] = params.error ? ["error", params.error] : ["ok", params.ok ?? ""];
  redirect(`${PATH}?${key}=${encodeURIComponent(value)}`);
}

const OK_TEXT: Record<HomeMode, string> = {
  texto: "Guardado. El inicio muestra ahora el texto de bienvenida.",
  noticias: "Guardado. El inicio muestra ahora las noticias activadas.",
};

/** Qué se ve en el inicio: el texto de bienvenida o las noticias. */
export async function saveHomeMode(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const mode: HomeMode = formData.get("modo") === "noticias" ? "noticias" : "texto";
  const { error } = await supabase
    .from("site_texts")
    .upsert({ key: HOME_MODE_KEY, body: mode, updated_at: new Date().toISOString(), updated_by: profile.id });
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: OK_TEXT[mode] });
}

/** Guarda el texto de bienvenida (desde su propio apartado). */
export async function saveWelcomeText(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const body = String(formData.get("body") ?? "").trim();
  const { error } = await supabase
    .from("site_texts")
    .upsert({ key: WELCOME_KEY, body, updated_at: new Date().toISOString(), updated_by: profile.id });
  revalidatePath("/", "layout");
  const [key, value] = error ? ["error", friendlyError(error.message)] : ["ok", "Texto de bienvenida guardado."];
  redirect(`${PATH}/texto?${key}=${encodeURIComponent(value)}`);
}
