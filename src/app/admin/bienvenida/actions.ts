"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";
import { POLL_KEY } from "@/lib/polls";
import { HOME_MODE_KEY, WELCOME_KEY, type HomeMode } from "@/lib/welcome";

const PATH = "/admin/bienvenida";

function done(params: { ok?: string; error?: string }) {
  revalidatePath("/", "layout");
  const [key, value] = params.error ? ["error", params.error] : ["ok", params.ok ?? ""];
  redirect(`${PATH}?${key}=${encodeURIComponent(value)}`);
}

const OK_TEXT: Record<HomeMode, string> = {
  texto: "Guardado. El inicio muestra ahora el texto de bienvenida.",
  noticias: "Guardado. El inicio muestra ahora las últimas noticias.",
  encuesta: "Guardado. El inicio muestra ahora la encuesta.",
};

export async function saveWelcome(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const body = String(formData.get("body") ?? "").trim();
  const raw = formData.get("modo");
  const mode: HomeMode = raw === "noticias" || raw === "encuesta" ? raw : "texto";
  const now = new Date().toISOString();

  if (mode === "encuesta") {
    const { data: current } = await supabase.from("site_texts").select("body").eq("key", POLL_KEY).maybeSingle();
    if (!current?.body) return done({ error: "Todavía no hay encuesta. Créala en la sección Encuestas." });
  }

  const { error } = await supabase.from("site_texts").upsert([
    { key: WELCOME_KEY, body, updated_at: now, updated_by: profile.id },
    { key: HOME_MODE_KEY, body: mode, updated_at: now, updated_by: profile.id },
  ]);
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: OK_TEXT[mode] });
}
