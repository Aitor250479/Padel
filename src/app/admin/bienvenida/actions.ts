"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";
import { POLL_KEY } from "@/lib/polls";
import { HOME_MODE_KEY, WELCOME_KEY, type HomeMode } from "@/lib/welcome";
import { nowInSpain } from "@/lib/weeks";

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

  const question = String(formData.get("question") ?? "").trim().slice(0, 300);
  if (mode === "encuesta" && question) {
    // Encuesta nueva: la base de datos la crea y la pone en el inicio.
    const { error: textError } = await supabase
      .from("site_texts")
      .upsert({ key: WELCOME_KEY, body, updated_at: now, updated_by: profile.id });
    if (textError) return done({ error: friendlyError(textError.message) });
    const day = String(formData.get("closes_day") ?? "");
    const time = String(formData.get("closes_time") ?? "");
    if (!day || !time) return done({ error: "Indica hasta qué día y hora estará abierta la encuesta" });
    const options = formData.getAll("option").map((o) => String(o).trim().slice(0, 120));
    const { error } = await supabase.rpc("create_poll", {
      p_question: question,
      p_options: options,
      p_closes_at: `${day}T${time}:00`,
    });
    if (error) return done({ error: friendlyError(error.message) });
    return done({ ok: "Encuesta creada. Ya se ve en el inicio." });
  }

  if (mode === "encuesta") {
    const { data: current } = await supabase.from("site_texts").select("body").eq("key", POLL_KEY).maybeSingle();
    if (!current?.body) return done({ error: "Escribe la pregunta y las respuestas de la encuesta" });
  }

  const { error } = await supabase.from("site_texts").upsert([
    { key: WELCOME_KEY, body, updated_at: now, updated_by: profile.id },
    { key: HOME_MODE_KEY, body: mode, updated_at: now, updated_by: profile.id },
  ]);
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: OK_TEXT[mode] });
}

/** Cambia hasta cuándo está abierta la encuesta actual, o la cierra ya. */
export async function updatePollClose(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id") ?? "");
  const closeNow = formData.get("close_now") === "1";
  const day = String(formData.get("closes_day") ?? "");
  const time = String(formData.get("closes_time") ?? "");
  const closesAt = closeNow ? `${nowInSpain().slice(0, 16)}:00` : `${day}T${time}:00`;
  if (!closeNow && (!day || !time)) return done({ error: "Indica el día y la hora de cierre" });
  const { error } = await supabase.from("polls").update({ closes_at: closesAt }).eq("id", id);
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: closeNow ? "Encuesta cerrada. El inicio muestra ya el resultado." : "Fecha de cierre cambiada." });
}
