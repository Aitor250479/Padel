"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { availablePairIds, availablePlayerIds } from "@/lib/availability";
import { makeIndividualPairings, type PastMatch } from "@/lib/individual-pairing";
import { MATCH_COLUMNS, loadPairDirectory, resultOpen, type Match } from "@/lib/matches";
import { makePairings, type Candidate } from "@/lib/pairing";
import { requireOrganizer, requireProfile } from "@/lib/session";
import { formatGames, gamesMatchResult, readGames } from "@/lib/score";
import { RESULT_OPTIONS } from "@/lib/standings";
import { currentLeague, isIndividual, onlyLeague, type League } from "@/lib/leagues";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nowInSpain } from "@/lib/weeks";

function back(path: string, params: Record<string, string>) {
  revalidatePath("/", "layout");
  redirect(`${path}?${new URLSearchParams(params)}`);
}

/** Pareja de la liga individual en curso para dos jugadores (la crea si hace falta). */
async function leaguePair(supabase: SupabaseClient, p1: string, p2: string) {
  const { data, error } = await supabase.rpc("league_pair", { p1, p2 });
  if (error) throw new Error(friendlyError(error.message));
  return data as string;
}

/** Lee los 4 jugadores de un formulario de liga individual (a1, a2, b1, b2). */
function readFour(formData: FormData) {
  const ids = ["a1", "a2", "b1", "b2"].map((k) => String(formData.get(k) ?? ""));
  if (ids.some((x) => !x)) return { error: "Elige los 4 jugadores" } as const;
  if (new Set(ids).size !== 4) return { error: "Elige 4 jugadores distintos" } as const;
  return { a: [ids[0], ids[1]], b: [ids[2], ids[3]] } as const;
}

async function generateIndividual(supabase: SupabaseClient, weekStart: string, league: League | null) {
  const [available, { data: matches }, directory] = await Promise.all([
    availablePlayerIds(supabase, weekStart),
    onlyLeague(
      supabase.from("matches").select("week_start, pair_a, pair_b").neq("status", "cancelado"),
      league,
    ).returns<{ week_start: string; pair_a: string; pair_b: string }[]>(),
    loadPairDirectory(supabase),
  ]);

  const played = new Map<string, number>();
  const busy = new Set<string>();
  const past: PastMatch[] = [];
  for (const m of matches ?? []) {
    const a = directory.membersOf(m.pair_a);
    const b = directory.membersOf(m.pair_b);
    for (const p of [...a, ...b]) {
      played.set(p, (played.get(p) ?? 0) + 1);
      if (m.week_start === weekStart) busy.add(p);
    }
    if (a.length === 2 && b.length === 2) past.push({ a: [a[0], a[1]], b: [b[0], b[1]] });
  }

  const candidates = available.filter((id) => !busy.has(id)).map((id) => ({ id, played: played.get(id) ?? 0 }));
  const result = makeIndividualPairings(candidates, past);

  try {
    const rows = [];
    for (const m of result.matches) {
      rows.push({
        week_start: weekStart,
        pair_a: await leaguePair(supabase, m.a[0], m.a[1]),
        pair_b: await leaguePair(supabase, m.b[0], m.b[1]),
      });
    }
    if (rows.length) {
      const { error } = await supabase.from("matches").insert(rows);
      if (error) throw new Error(friendlyError(error.message));
    }
  } catch (e) {
    return back("/partidos", { semana: weekStart, error: (e as Error).message });
  }

  const resting = result.resting.length;
  back("/partidos", {
    semana: weekStart,
    ok:
      result.matches.length === 0
        ? "No hay al menos 4 jugadores libres que puedan jugar esta semana."
        : `Creados ${result.matches.length} partidos.` +
          (resting ? ` ${resting === 1 ? "Descansa 1 jugador" : `Descansan ${resting} jugadores`} esta semana.` : ""),
  });
}

export async function generatePairings(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const weekStart = String(formData.get("week_start"));

  const league = await currentLeague(supabase);
  if (isIndividual(league)) return generateIndividual(supabase, weekStart, league);
  const [available, { data: matches }] = await Promise.all([
    availablePairIds(supabase, weekStart),
    onlyLeague(
      supabase.from("matches").select("week_start, pair_a, pair_b").neq("status", "cancelado"),
      league,
    ).returns<{ week_start: string; pair_a: string; pair_b: string }[]>(),
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
    if (error) return back("/partidos", { semana: weekStart, error: friendlyError(error.message) });
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
  if (formData.has("a1")) {
    const four = readFour(formData);
    if ("error" in four) return back("/partidos", { semana: weekStart, error: four.error! });
    let error: string | null = null;
    try {
      const pairA = await leaguePair(supabase, four.a[0], four.a[1]);
      const pairB = await leaguePair(supabase, four.b[0], four.b[1]);
      const res = await supabase.from("matches").insert({ week_start: weekStart, pair_a: pairA, pair_b: pairB });
      if (res.error) error = friendlyError(res.error.message);
    } catch (e) {
      error = (e as Error).message;
    }
    return back("/partidos", error ? { semana: weekStart, error } : { semana: weekStart, ok: "Partido creado." });
  }
  const a = String(formData.get("pair_a") ?? "");
  const b = String(formData.get("pair_b") ?? "");
  if (!a || !b || a === b) {
    return back("/partidos", { semana: weekStart, error: "Elige dos parejas distintas" });
  }
  const { error } = await supabase.from("matches").insert({ week_start: weekStart, pair_a: a, pair_b: b });
  back("/partidos", error ? { semana: weekStart, error: friendlyError(error.message) } : { semana: weekStart, ok: "Partido creado." });
}

export async function updateMatch(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  let a = String(formData.get("pair_a"));
  let b = String(formData.get("pair_b"));
  if (formData.has("a1")) {
    const four = readFour(formData);
    if ("error" in four) return back(`/partidos/${id}`, { error: four.error! });
    try {
      a = await leaguePair(supabase, four.a[0], four.a[1]);
      b = await leaguePair(supabase, four.b[0], four.b[1]);
    } catch (e) {
      return back(`/partidos/${id}`, { error: (e as Error).message });
    }
  }
  if (a === b) return back(`/partidos/${id}`, { error: "Elige dos parejas distintas" });
  const { error } = await supabase
    .from("matches")
    .update({ pair_a: a, pair_b: b, status: String(formData.get("status")) })
    .eq("id", id);
  back(`/partidos/${id}`, error ? { error: friendlyError(error.message) } : { ok: "Partido actualizado." });
}

export async function deleteMatch(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const weekStart = String(formData.get("week_start"));
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return back(`/partidos/${id}`, { error: friendlyError(error.message) });
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
  back(`/partidos/${id}`, error ? { error: friendlyError(error.message) } : { ok: "Lugar, fecha y hora guardados." });
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

  const { data: match } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) return back("/partidos", { error: "Partido no encontrado" });

  const myPair = (await loadPairDirectory(supabase)).sideOf(match, profile);
  const isPlayer = !!myPair;
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
    return back(`/partidos/${id}`, error ? { error: friendlyError(error.message) } : { ok: "Resultado borrado." });
  }

  if (!option) return back(`/partidos/${id}`, { error: "Elige un resultado" });
  const games = readGames((name) => formData.get(name));
  if ("error" in games) return back(`/partidos/${id}`, { error: games.error });
  const mismatch = gamesMatchResult(games.sets, option);
  if (mismatch) return back(`/partidos/${id}`, { error: mismatch });
  const detail = formatGames(games.sets);
  const { error } = await supabase.from("match_results").upsert(
    pairs.map((pairId) => ({
      match_id: id,
      pair_id: pairId,
      sets_a: option.a,
      sets_b: option.b,
      score_detail: detail,
    })),
  );
  back(`/partidos/${id}`, error ? { error: friendlyError(error.message) } : { ok: "Resultado guardado." });
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
    const games = readGames((name) => formData.get(name));
    if ("error" in games) return back(path, { ...extra, error: games.error });
    const mismatch = gamesMatchResult(games.sets, option);
    if (mismatch) return back(path, { ...extra, error: mismatch });
    a = option.a;
    b = option.b;
    detail = formatGames(games.sets);
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
  back(path, error ? { ...extra, error: friendlyError(error.message) } : { ...extra, ok: "Resultado confirmado por el organizador." });
}
