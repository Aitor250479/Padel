"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";

/** Cambia el código de invitación de una categoría o liga: el enlace anterior deja de valer. */
export async function renewInvite(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const target = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "");
  const path = back.startsWith("/admin/") ? back : "/admin/bienvenida";
  const { error } = await supabase.rpc("renew_invite_code", { target });
  revalidatePath("/", "layout");
  const [key, value] = error
    ? ["error", friendlyError(error.message)]
    : ["ok", "Enlace de invitación cambiado. El anterior ya no sirve."];
  redirect(`${path}?${key}=${encodeURIComponent(value)}`);
}
