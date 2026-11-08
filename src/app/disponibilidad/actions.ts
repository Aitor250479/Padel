"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/errors";
import { requireProfile } from "@/lib/session";
import { currentWeek, parseWeek } from "@/lib/weeks";

export async function setAvailability(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (profile.active === false) redirect("/");
  const weekStart = parseWeek(String(formData.get("week_start") ?? ""));
  const value = String(formData.get("can_play"));
  if (weekStart < currentWeek()) return; // semanas pasadas: no se cambian

  const { error } =
    value === "clear"
      ? await supabase
          .from("player_availability")
          .delete()
          .eq("profile_id", profile.id)
          .eq("week_start", weekStart)
      : await supabase.from("player_availability").upsert({
          profile_id: profile.id,
          week_start: weekStart,
          can_play: value === "yes",
          updated_at: new Date().toISOString(),
        });
  revalidatePath("/disponibilidad");
  revalidatePath("/partidos");
  revalidatePath("/");
  if (error) {
    redirect(`/disponibilidad?${new URLSearchParams({ semana: weekStart, error: friendlyError(error.message) })}`);
  }
}
