"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makePairings, type Candidate } from "@/lib/pairing";
import { requireOrganizer, requireProfile } from "@/lib/session";
import { slotKey, weekDays } from "@/lib/weeks";

function back(path: string, params: Record<string, string>) {
  revalidatePath("/", "layout");
  redirect(`${path}?${new URLSearchParams(params)}`);
}

export async function generatePairings(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const weekStart = String(formData.get("week_start"));
  const days = weekDays(weekStart);

  const [{ data: pairs }, { data: slots }, { data: matches }] = await Promise.all([
    supabase.from("pairs").select("id").returns<{ id: string }[]>(),
    supabase
      .from("availability")
      .select("pair_id, day, hour")
      .gte("day", days[0])
      .lte("day", days[6])
      .returns<{ pair_id: string; day: string; hour: number }[]>(),
    supabase
      .from("matches")
      .select("week_start, pair_a, pair_b")
      .neq("status", "cancelado")
      .returns<{ week_start: string; pair_a: string; pair_b: string }[]>(),
  ]);

  const played = new Map<string, number>();
  const busy = new Set<string>();
  for (const m of matches ?? []) {
    for (const p of [m.pair_a, m.pair_b]) {
      played.set(p, (played.get(p) ?? 0) + 1);
      if (m.week_start === weekStart) busy.add(p);
    }
  }

  const slotsByPair = new Map<string, string[]>();
  for (const s of slots ?? []) {
    if (!slotsByPair.has(s.pair_id)) slotsByPair.set(s.pair_id, []);
    slotsByPair.get(s.pair_id)!.push(slotKey(s.day, s.hour));
  }

  const candidates: Candidate[] = (pairs ?? [])
    .filter((p) => !busy.has(p.id) && slotsByPair.has(p.id))
    .map((p) => ({ id: p.id, played: played.get(p.id) ?? 0, slots: slotsByPair.get(p.id)! }));

  let result;
  try {
    result = makePairings(candidates);
  } catch (e) {
    return back("/partidos", { semana: weekStart, error: (e as Error).message });
  }

  if (result.matches.length) {
    const { error } = await supabase.from("matches").insert(
      result.matches.map((m) => {
        const [day, hour] = m.slot.split("|");
        return {
          week_start: weekStart,
          pair_a: m.a,
          pair_b: m.b,
          slot_day: day,
          slot_hour: Number(hour),
        };
      }),
    );
    if (error) return back("/partidos", { semana: weekStart, error: error.message });
  }

  back("/partidos", {
    semana: weekStart,
    ok:
      result.matches.length === 0
        ? "No hay parejas libres que coincidan en ninguna franja."
        : `Creados ${result.matches.length} partidos.` +
          (result.unmatched.length
            ? ` ${result.unmatched.length} pareja(s) con disponibilidad se quedan sin rival.`
            : ""),
  });
}

export async function createMatch(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const weekStart = String(formData.get("week_start"));
  const a = String(formData.get("pair_a") ?? "");
  const b = String(formData.get("pair_b") ?? "");
  if (!a || !b || a === b) {
    return back("/partidos", { semana: weekStart, error: "Elige dos parejas distintas" });
  }
  const { error } = await supabase.from("matches").insert({ week_start: weekStart, pair_a: a, pair_b: b });
  back("/partidos", error ? { semana: weekStart, error: error.message } : { semana: weekStart, ok: "Partido creado." });
}

export async function updateMatch(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const slot = String(formData.get("slot") ?? "");
  const [day, hour] = slot ? slot.split("|") : [null, null];
  const a = String(formData.get("pair_a"));
  const b = String(formData.get("pair_b"));
  if (a === b) return back(`/partidos/${id}`, { error: "Elige dos parejas distintas" });
  const { error } = await supabase
    .from("matches")
    .update({
      pair_a: a,
      pair_b: b,
      slot_day: day,
      slot_hour: hour === null ? null : Number(hour),
      status: String(formData.get("status")),
    })
    .eq("id", id);
  back(`/partidos/${id}`, error ? { error: error.message } : { ok: "Partido actualizado." });
}

export async function deleteMatch(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const weekStart = String(formData.get("week_start"));
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return back(`/partidos/${id}`, { error: error.message });
  back("/partidos", { semana: weekStart, ok: "Partido borrado." });
}

export async function saveBooking(formData: FormData) {
  const { supabase } = await requireProfile();
  const id = String(formData.get("id"));
  const place = String(formData.get("booking_place") ?? "").trim().slice(0, 200);
  const at = String(formData.get("booking_at") ?? "");
  const { data, error } = await supabase
    .from("matches")
    .update({ booking_place: place || null, booking_at: at || null })
    .eq("id", id)
    .select("id");
  if (!error && !data?.length) {
    return back(`/partidos/${id}`, { error: "Solo los jugadores del partido pueden cambiar la reserva" });
  }
  back(`/partidos/${id}`, error ? { error: error.message } : { ok: "Reserva guardada." });
}
