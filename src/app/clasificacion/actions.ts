"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";

export async function resetLeague(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const word = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (word !== "REINICIAR") {
    redirect(`/clasificacion?error=${encodeURIComponent("Escribe REINICIAR para confirmar.")}`);
  }
  const { data, error } = await supabase.rpc("reset_league");
  revalidatePath("/", "layout");
  if (error) redirect(`/clasificacion?error=${encodeURIComponent(error.message)}`);
  redirect(
    `/clasificacion?ok=${encodeURIComponent(`Liga reiniciada: se han borrado ${data ?? 0} partidos. ¡A empezar de cero!`)}`,
  );
}
