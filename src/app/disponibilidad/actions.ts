"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";
import { parseWeek } from "@/lib/weeks";

export async function setAvailability(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const weekStart = parseWeek(String(formData.get("week_start") ?? ""));
  const value = String(formData.get("can_play"));

  if (value === "clear") {
    await supabase
      .from("player_availability")
      .delete()
      .eq("profile_id", profile.id)
      .eq("week_start", weekStart);
  } else {
    await supabase.from("player_availability").upsert({
      profile_id: profile.id,
      week_start: weekStart,
      can_play: value === "yes",
      updated_at: new Date().toISOString(),
    });
  }
  revalidatePath("/disponibilidad");
  revalidatePath("/partidos");
}
