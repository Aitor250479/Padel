"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";
import { HOME_MODE_KEY, WELCOME_KEY } from "@/lib/welcome";

export async function saveWelcome(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const body = String(formData.get("body") ?? "").trim();
  const mode = formData.get("modo") === "noticias" ? "noticias" : "texto";
  const now = new Date().toISOString();
  const { error } = await supabase.from("site_texts").upsert([
    { key: WELCOME_KEY, body, updated_at: now, updated_by: profile.id },
    { key: HOME_MODE_KEY, body: mode, updated_at: now, updated_by: profile.id },
  ]);
  revalidatePath("/", "layout");
  if (error) redirect(`/admin/bienvenida?error=${encodeURIComponent(error.message)}`);
  redirect(
    `/admin/bienvenida?ok=${encodeURIComponent(
      mode === "noticias"
        ? "Guardado. El inicio muestra ahora las últimas noticias."
        : "Guardado. El inicio muestra ahora el texto de bienvenida.",
    )}`,
  );
}
