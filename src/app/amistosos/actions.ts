"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/errors";
import { FRIENDLY_COLUMNS, SLOTS, started, type FriendlyMatch } from "@/lib/friendlies";
import { formatGames, gamesMatchResult, readGames } from "@/lib/score";
import { requireProfile } from "@/lib/session";
import { RESULT_OPTIONS } from "@/lib/standings";
import { nowInSpain } from "@/lib/weeks";

function back(path: string, params: Record<string, string>) {
  revalidatePath("/", "layout");
  redirect(`${path}?${new URLSearchParams(params)}`);
}

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Lee fecha y hora ("YYYY-MM-DDTHH:MM") y comprueba que es futura. */
function readPlayAt(formData: FormData): { at: string } | { error: string } {
  const at = String(formData.get("play_at") ?? "").slice(0, 16);
  if (!DATETIME.test(at)) return { error: "Indica la fecha y la hora del partido" };
  if (at <= nowInSpain()) return { error: "La fecha y hora del amistoso tienen que ser futuras" };
  return { at };
}

const readPlace = (formData: FormData) => String(formData.get("place") ?? "").trim().slice(0, 200) || null;

export async function createFriendly(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const when = readPlayAt(formData);
  if ("error" in when) return back("/amistosos", { error: when.error });
  const { data, error } = await supabase
    .from("friendly_matches")
    .insert({ play_at: when.at, place: readPlace(formData), created_by: profile.id })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return back("/amistosos", { error: friendlyError(error?.message) });
  back(`/amistosos/${data.id}`, { ok: "¡Amistoso creado! Ya estás apuntado. Avisa al grupo para que se apunten." });
}

export async function updateFriendly(formData: FormData) {
  const { supabase } = await requireProfile();
  const id = String(formData.get("id"));
  const when = readPlayAt(formData);
  if ("error" in when) return back(`/amistosos/${id}`, { error: when.error });
  const { data, error } = await supabase
    .from("friendly_matches")
    .update({ play_at: when.at, place: readPlace(formData) })
    .eq("id", id)
    .select("id");
  if (!error && !data?.length) {
    return back(`/amistosos/${id}`, { error: "Solo quien creó el amistoso puede cambiar la fecha, la hora o el lugar" });
  }
  back(`/amistosos/${id}`, error ? { error: friendlyError(error.message) } : { ok: "Fecha, hora y lugar guardados." });
}

export async function deleteFriendly(formData: FormData) {
  const { supabase } = await requireProfile();
  const id = String(formData.get("id"));
  const { data, error } = await supabase.from("friendly_matches").delete().eq("id", id).select("id");
  if (error) return back(`/amistosos/${id}`, { error: friendlyError(error.message) });
  if (!data?.length) {
    return back(`/amistosos/${id}`, { error: "Solo quien creó el amistoso puede borrarlo, y antes de que se juegue" });
  }
  back("/amistosos", { ok: "Amistoso borrado." });
}

/**
 * Apuntarse a un hueco libre (o cambiarse a él si ya estaba apuntado).
 * Un organizador puede apuntar a cualquiera con `profile_id`.
 */
export async function joinFriendly(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = String(formData.get("id"));
  const side = String(formData.get("side"));
  const slot = Number(formData.get("slot"));
  if (!SLOTS.some((s) => s.side === side && s.slot === slot)) return back(`/amistosos/${id}`, { error: "Ese hueco no existe" });
  const who = (profile.is_organizer && String(formData.get("profile_id") ?? "")) || profile.id;

  const { data: already } = await supabase
    .from("friendly_players")
    .select("profile_id")
    .eq("match_id", id)
    .eq("profile_id", who)
    .maybeSingle();
  const { error } = already
    ? await supabase.from("friendly_players").update({ side, slot }).eq("match_id", id).eq("profile_id", who)
    : await supabase.from("friendly_players").insert({ match_id: id, profile_id: who, side, slot });
  if (error) return back(`/amistosos/${id}`, { error: friendlyError(error.message) });
  const self = who === profile.id;
  back(`/amistosos/${id}`, {
    ok: already ? "Cambio de hueco hecho." : self ? "¡Apuntado! 🎾" : "Jugador apuntado.",
  });
}

/** Desapuntarse (o, si es organizador, quitar a otro jugador con `profile_id`). */
export async function leaveFriendly(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = String(formData.get("id"));
  const who = (profile.is_organizer && String(formData.get("profile_id") ?? "")) || profile.id;
  const { data, error } = await supabase
    .from("friendly_players")
    .delete()
    .eq("match_id", id)
    .eq("profile_id", who)
    .select("match_id");
  if (error) return back(`/amistosos/${id}`, { error: friendlyError(error.message) });
  if (!data?.length) return back(`/amistosos/${id}`, { error: "Ese jugador no estaba apuntado" });
  // Si era el último, el partido se ha borrado solo.
  const { data: still } = await supabase.from("friendly_matches").select("id").eq("id", id).maybeSingle();
  if (!still) return back("/amistosos", { ok: "Te has desapuntado. Como no quedaba nadie, el amistoso se ha borrado." });
  back(`/amistosos/${id}`, { ok: who === profile.id ? "Te has desapuntado." : "Jugador quitado del amistoso." });
}

/** Cualquiera de los 4 pone o corrige el resultado, sin confirmación. */
export async function saveFriendlyResult(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = String(formData.get("id"));
  const path = `/amistosos/${id}`;
  const { data: match } = await supabase
    .from("friendly_matches")
    .select(FRIENDLY_COLUMNS)
    .eq("id", id)
    .maybeSingle<FriendlyMatch>();
  if (!match) return back("/amistosos", { error: "Amistoso no encontrado" });
  if (!profile.is_organizer && !started(match, nowInSpain())) {
    return back(path, { error: "El resultado se puede poner cuando haya pasado la fecha del partido" });
  }

  let values: { sets_a: number | null; sets_b: number | null; score_detail: string | null };
  if (formData.get("clear") === "1") {
    values = { sets_a: null, sets_b: null, score_detail: null };
  } else {
    const option = RESULT_OPTIONS.find((o) => o.value === String(formData.get("result") ?? ""));
    if (!option) return back(path, { error: "Elige un resultado" });
    const games = readGames((name) => formData.get(name));
    if ("error" in games) return back(path, { error: games.error });
    const mismatch = gamesMatchResult(games.sets, option);
    if (mismatch) return back(path, { error: mismatch });
    values = { sets_a: option.a, sets_b: option.b, score_detail: formatGames(games.sets) };
  }

  const { data, error } = await supabase.from("friendly_matches").update(values).eq("id", id).select("id");
  if (!error && !data?.length) return back(path, { error: "Solo los jugadores del amistoso pueden poner el resultado" });
  back(
    path,
    error
      ? { error: friendlyError(error.message) }
      : { ok: values.sets_a === null ? "Resultado borrado." : "Resultado guardado." },
  );
}
