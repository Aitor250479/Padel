"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";

/** Vota en la encuesta del inicio, o cambia el voto mientras siga abierta. */
export async function vote(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (profile.active === false) redirect("/");
  const pollId = String(formData.get("poll_id") ?? "");
  const optionId = String(formData.get("option_id") ?? "");
  if (!pollId || !optionId) redirect(`/?error=${encodeURIComponent("Elige una respuesta")}#encuesta`);
  const { error } = await supabase
    .from("poll_votes")
    .upsert({ poll_id: pollId, profile_id: profile.id, option_id: optionId }, { onConflict: "poll_id,profile_id" });
  revalidatePath("/");
  redirect(
    error
      ? `/?error=${encodeURIComponent(friendlyError(error.message))}#encuesta`
      : `/?ok=${encodeURIComponent("¡Voto guardado! Puedes cambiarlo hasta que se cierre la encuesta.")}#encuesta`,
  );
}
