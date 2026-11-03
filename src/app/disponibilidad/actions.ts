"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";
import { HOURS, weekDays } from "@/lib/weeks";

export async function saveAvailability(
  weekStart: string,
  slots: { day: string; hour: number }[],
): Promise<{ error?: string }> {
  const { supabase, profile } = await requireProfile();
  if (!profile.pair_id) return { error: "No tienes pareja asignada" };
  const pairId = profile.pair_id;

  const days = new Set(weekDays(weekStart));
  if (!days.has(weekStart)) return { error: "Semana no válida" };
  const valid = slots.filter((s) => days.has(s.day) && HOURS.includes(s.hour));

  const del = await supabase
    .from("availability")
    .delete()
    .eq("pair_id", pairId)
    .in("day", [...days]);
  if (del.error) return { error: del.error.message };

  if (valid.length) {
    const ins = await supabase
      .from("availability")
      .insert(valid.map((s) => ({ pair_id: pairId, day: s.day, hour: s.hour })));
    if (ins.error) return { error: ins.error.message };
  }

  const week = await supabase
    .from("availability_weeks")
    .upsert({ pair_id: pairId, week_start: weekStart, updated_at: new Date().toISOString() });
  if (week.error) return { error: week.error.message };

  revalidatePath("/disponibilidad");
  return {};
}
