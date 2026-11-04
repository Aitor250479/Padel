"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";
import { WELCOME_KEY } from "@/lib/welcome";

export async function saveWelcome(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const body = String(formData.get("body") ?? "").trim();
  const { error } = await supabase
    .from("site_texts")
    .upsert({ key: WELCOME_KEY, body, updated_at: new Date().toISOString(), updated_by: profile.id });
  revalidatePath("/", "layout");
  if (error) redirect(`/admin/bienvenida?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/bienvenida?ok=${encodeURIComponent("Texto guardado. Ya aparece en la pantalla principal.")}`);
}
