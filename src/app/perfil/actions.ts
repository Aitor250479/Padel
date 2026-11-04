"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";

export async function saveName(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 60);
  await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", profile.id);
  revalidatePath("/", "layout");
}

export async function savePassword(formData: FormData) {
  const { supabase } = await requireProfile();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  if (password.length < 6) redirect(`/perfil?error=${encodeURIComponent("La contraseña debe tener al menos 6 caracteres.")}`);
  if (password !== password2) redirect(`/perfil?error=${encodeURIComponent("Las dos contraseñas no coinciden.")}`);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/perfil?error=${encodeURIComponent(error.message)}`);
  redirect(
    `/perfil?ok=${encodeURIComponent("Contraseña guardada. A partir de ahora entra con tu email y esta contraseña.")}`,
  );
}

export async function saveEmail(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email === profile.email) redirect(`/perfil?error=${encodeURIComponent("Ese ya es tu email.")}`);
  const { error } = await supabase.rpc("change_email", { target: profile.id, new_email: email });
  if (error) redirect(`/perfil?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect(
    `/perfil?ok=${encodeURIComponent(`Email cambiado. A partir de ahora entra con ${email} y tu contraseña de siempre.`)}`,
  );
}
