"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";

export async function saveName(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 60);
  await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", profile.id);
  revalidatePath("/", "layout");
}
