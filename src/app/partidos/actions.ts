"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { availablePairIds } from "@/lib/availability";
import { MATCH_COLUMNS, resultOpen, type Match } from "@/lib/matches";
import { makePairings, type Candidate } from "@/lib/pairing";
import { requireOrganizer, requireProfile } from "@/lib/session";
import { RESULT_OPTIONS } from "@/lib/standings";
import { nowInSpain } from "@/lib/weeks";

function back(path: string, params: Record<string, string>) {
  revalidatePath("/", "layout");
  redirect(`${path}?${new URLSearchParams(params)}`);
}

export async function generatePairings(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const weekStart = String(formData.get("week_start"));

  const [available, { data: matches }] = await Promise.all([
    availablePairIds(supabase, weekStart),
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

  let candidates: Candidate[] = available
    .filter((id) => !busy.has(id))
    .map((id) => ({ id, played: played.get(id) ?? 0, slots: ["semana"] }));

  // Con un número impar descansa la pareja que más partidos lleva (si empatan, al azar).
  let resting: string | null = null;
  if (candidates.length % 2 === 1) {
    const max = Math.max(...candidates.map((c) => c.played));
    const top = candidates.filter((c) => c.played === max);
    resting = top[Math.floor(Math.random() * top.length)].id;
    candidates = candidates.filter((c) => c.id !== resting);
  }

  const result = makePairings(candidates);

  if (result.matches.length) {
    const { error } = await supabase
      .from("matches")
      .insert(result.matches.map((m) => ({ week_start: weekStart, pair_a: m.a, pair_b: m.b })));
    if (error) return back("/partidos", { semana: weekStart, error: error.message });
  }

  back("/partidos", {
    semana: weekStart,
    ok:
      result.matches.length === 0
        ? "No hay parejas libres con los dos jugadores disponibles."
        : `Creados ${result.matches.length} partidos.` +
          (resting ? " Como sois impares, una pareja descansa esta semana." : ""),
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
  const a = String(formData.get("pair_a"));
  const b = String(formData.get("pair_b"));
  if (a === b) return back(`/partidos/${id}`, { error: "Elige dos parejas distintas" });
  const { error } = await supabase
    .from("matches")
    .update({ pair_a: a, pair_b: b, status: String(formData.get("status")) })
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
  back(`/partidos/${id}`, error ? { error: error.message } : { ok: "Lugar, fecha y hora guardados." });
}

/**
 * Cada pareja introduce su resultado. Cuenta cuando las dos coinciden.
 * Un organizador puede fijar el resultado de las dos parejas a la vez.
 */
export async function saveResult(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = String(formData.get("id"));
  const asOrganizer = formData.get("as_organizer") === "1" && profile.is_organizer;
  const clear = formData.get("clear") === "1";
  const option = RESULT_OPTIONS.find((o) => o.value === String(formData.get("result") ?? ""));
  const detail = String(formData.get("score_detail") ?? "").trim().slice(0, 60);

  const { data: match } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) return back("/partidos", { error: "Partido no encontrado" });

  const myPair = profile.pair_id;
  const isPlayer = !!myPair && [match.pair_a, match.pair_b].includes(myPair);
  if (!asOrganizer && !isPlayer) {
    return back(`/partidos/${id}`, { error: "Solo los jugadores del partido pueden poner el resultado" });
  }
  if (!asOrganizer && !resultOpen(match, nowInSpain())) {
    return back(`/partidos/${id}`, { error: "El resultado se puede poner cuando haya pasado la fecha del partido" });
  }

  const pairs = asOrganizer ? [match.pair_a, match.pair_b] : [myPair!];

  if (clear) {
    const { error } = await supabase
      .from("match_results")
      .delete()
      .eq("match_id", id)
      .in("pair_id", pairs);
    return back(`/partidos/${id}`, error ? { error: error.message } : { ok: "Resultado borrado." });
  }

  if (!option) return back(`/partidos/${id}`, { error: "Elige un resultado" });
  const { error } = await supabase.from("match_results").upsert(
    pairs.map((pairId) => ({
      match_id: id,
      pair_id: pairId,
      sets_a: option.a,
      sets_b: option.b,
      score_detail: detail || null,
    })),
  );
  back(`/partidos/${id}`, error ? { error: error.message } : { ok: "Resultado guardado." });
}

/** El organizador da por bueno el resultado que puso una de las parejas (o fija uno). */
export async function confirmResultAsOrganizer(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const week = String(formData.get("week") ?? "");
  const path = "/partidos";
  const extra: Record<string, string> = week ? { semana: week } : {};

  const { data: match } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) return back(path, { ...extra, error: "Partido no encontrado" });

  const fromPair = String(formData.get("from_pair") ?? "");
  let a: number, b: number, detail: string | null;
  if (fromPair) {
    const { data: p } = await supabase
      .from("match_results")
      .select("sets_a, sets_b, score_detail")
      .eq("match_id", id)
      .eq("pair_id", fromPair)
      .maybeSingle<{ sets_a: number; sets_b: number; score_detail: string | null }>();
    if (!p) return back(path, { ...extra, error: "Ese resultado ya no existe" });
    ({ sets_a: a, sets_b: b, score_detail: detail } = p);
  } else {
    const option = RESULT_OPTIONS.find((o) => o.value === String(formData.get("result") ?? ""));
    if (!option) return back(path, { ...extra, error: "Elige un resultado" });
    a = option.a;
    b = option.b;
    detail = String(formData.get("score_detail") ?? "").trim().slice(0, 60) || null;
  }

  const { error } = await supabase.from("match_results").upsert(
    [match.pair_a, match.pair_b].map((pairId) => ({
      match_id: id,
      pair_id: pairId,
      sets_a: a,
      sets_b: b,
      score_detail: detail,
    })),
  );
  back(path, error ? { ...extra, error: error.message } : { ...extra, ok: "Resultado confirmado por el organizador." });
}
