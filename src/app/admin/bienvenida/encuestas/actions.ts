"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";
import { pollOpen } from "@/lib/polls";
import { nowInSpain } from "@/lib/weeks";

const PATH = "/admin/bienvenida/encuestas";

function done(path: string, params: { ok?: string; error?: string }) {
  revalidatePath("/", "layout");
  const [key, value] = params.error ? ["error", params.error] : ["ok", params.ok ?? ""];
  redirect(`${path}?${key}=${encodeURIComponent(value)}`);
}

/** Crea una encuesta nueva: sustituye a la actual y pasa a verse en el inicio. */
export async function createPoll(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const question = String(formData.get("question") ?? "").trim().slice(0, 300);
  if (!question) return done(PATH, { error: "Escribe la pregunta de la encuesta" });
  const day = String(formData.get("closes_day") ?? "");
  const time = String(formData.get("closes_time") ?? "");
  if (!day || !time) return done(PATH, { error: "Indica hasta qué día y hora estará abierta la encuesta" });
  const options = formData.getAll("option").map((o) => String(o).trim().slice(0, 120));
  const { data: id, error } = await supabase.rpc("create_poll", {
    p_question: question,
    p_options: options,
    p_closes_at: `${day}T${time}:00`,
  });
  if (error) return done(PATH, { error: friendlyError(error.message) });
  done(`${PATH}/${id}`, { ok: "Encuesta creada. Ya se ve en el inicio." });
}

/** Cambia hasta cuándo está abierta una encuesta, o la cierra ya. Una cerrada ya no se toca. */
export async function updatePollClose(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id") ?? "");
  const path = `${PATH}/${id}`;
  const { data: poll } = await supabase.from("polls").select("closes_at").eq("id", id).maybeSingle<{ closes_at: string }>();
  if (!poll) return done(PATH, { error: "Esa encuesta ya no existe" });
  const now = nowInSpain();
  if (!pollOpen(poll, now)) return done(path, { error: "La encuesta ya está cerrada y no se puede cambiar" });
  const closeNow = formData.get("close_now") === "1";
  const day = String(formData.get("closes_day") ?? "");
  const time = String(formData.get("closes_time") ?? "");
  if (!closeNow && (!day || !time)) return done(path, { error: "Indica el día y la hora de cierre" });
  const closesAt = closeNow ? `${now.slice(0, 16)}:00` : `${day}T${time}:00`;
  if (!closeNow && closesAt.slice(0, 16) <= now.slice(0, 16)) {
    return done(path, { error: "La nueva hora de cierre tiene que ser futura. Para cerrarla ahora pulsa Cerrar ya." });
  }
  const { error } = await supabase.from("polls").update({ closes_at: closesAt }).eq("id", id);
  if (error) return done(path, { error: friendlyError(error.message) });
  done(path, { ok: closeNow ? "Encuesta cerrada. Ya se ve el resultado." : "Fecha de cierre cambiada." });
}
