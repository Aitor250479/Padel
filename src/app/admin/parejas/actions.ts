"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";

/** Vuelve a la pantalla indicada en el campo "back" (solo rutas de /admin). */
function backTo(formData: FormData, fallback = "/admin/parejas") {
  const back = String(formData.get("back") ?? "");
  return back.startsWith("/admin/") ? back : fallback;
}

function done(path: string, result?: { error?: { message: string } | null; ok?: string }) {
  revalidatePath("/", "layout");
  if (result?.error) redirect(`${path}?error=${encodeURIComponent(friendlyError(result.error.message))}`);
  if (result?.ok) redirect(`${path}?ok=${encodeURIComponent(result.ok)}`);
  redirect(path);
}

export async function createPair(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return done("/admin/parejas", { error: { message: "Pon un nombre a la pareja" } });
  const { data, error } = await supabase.from("pairs").insert({ name }).select("id").single();
  if (error || !data) return done("/admin/parejas", { error });
  done(`/admin/parejas/${data.id}`, { ok: "Pareja creada. Añádele sus dos jugadores." });
}

export async function renamePair(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const path = `/admin/parejas/${id}`;
  if (!name) return done(path, { error: { message: "El nombre no puede estar vacío" } });
  const { error } = await supabase.from("pairs").update({ name }).eq("id", id);
  done(path, error ? { error } : { ok: "Nombre cambiado" });
}

export async function deletePair(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("pairs").delete().eq("id", id);
  if (error) return done(`/admin/parejas/${id}`, { error });
  done("/admin/parejas", { ok: "Pareja borrada" });
}

export async function assignPlayer(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const playerId = String(formData.get("player_id"));
  const pairId = String(formData.get("pair_id") ?? "");
  const { error } = await supabase
    .from("profiles")
    .update({ pair_id: pairId || null })
    .eq("id", playerId);
  done(backTo(formData), error ? { error } : { ok: pairId ? "Jugador asignado" : "Jugador quitado de la pareja" });
}

export async function toggleOrganizer(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const playerId = String(formData.get("player_id"));
  const path = `/admin/jugadores/${playerId}`;
  if (playerId === profile.id) return done(path, { error: { message: "No puedes quitarte el rol a ti mismo" } });
  const makeOrganizer = formData.get("value") === "true";
  const { error } = await supabase
    .from("profiles")
    .update({ is_organizer: makeOrganizer })
    .eq("id", playerId);
  done(path, error ? { error } : { ok: makeOrganizer ? "Ahora es organizador" : "Ya no es organizador" });
}

export async function savePlayerName(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const playerId = String(formData.get("player_id"));
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 60);
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", playerId);
  done(`/admin/jugadores/${playerId}`, error ? { error } : { ok: "Nombre guardado" });
}

export async function setPlayerEmail(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const playerId = String(formData.get("player_id"));
  const email = String(formData.get("email") ?? "").trim();
  const { error } = await supabase.rpc("change_email", { target: playerId, new_email: email });
  done(
    `/admin/jugadores/${playerId}`,
    error ? { error } : { ok: `Email cambiado. Desde ahora el jugador entra con ${email.toLowerCase()}.` },
  );
}

export async function setPlayerPassword(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const playerId = String(formData.get("player_id"));
  const password = String(formData.get("password") ?? "");
  const path = `/admin/jugadores/${playerId}`;
  if (password.length < 6) return done(path, { error: { message: "La contraseña debe tener al menos 6 caracteres" } });
  const { error } = await supabase.rpc("admin_set_password", {
    target: playerId,
    new_password: password,
  });
  done(path, error ? { error } : { ok: "Contraseña cambiada. Pásasela al jugador para que entre." });
}

/** Guarda las parejas sorteadas en /admin/parejas/sorteo. */
export async function applyRandomPairs(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const all = formData.get("modo") === "todos";
  const retry = `/admin/parejas/sorteo?modo=${all ? "todos" : "sin"}`;
  const groups = formData.getAll("grupo").map((g) => {
    const [a, b, ...name] = String(g).split(",");
    return { a, b, name: name.join(",").trim() };
  });

  const ids = groups.flatMap((g) => [g.a, g.b]);
  if (!groups.length || new Set(ids).size !== ids.length || groups.some((g) => !g.name)) {
    return done(retry, { error: { message: "Sorteo no válido, vuelve a intentarlo" } });
  }

  const [{ data: pairs }, { data: players }] = await Promise.all([
    supabase.from("pairs").select("id, name"),
    supabase.from("profiles").select("id, pair_id").in("id", ids),
  ]);
  if ((players ?? []).length !== ids.length) {
    return done(retry, { error: { message: "Algún jugador ya no existe, vuelve a sortear" } });
  }
  if (!all && (players ?? []).some((p) => p.pair_id)) {
    return done(retry, { error: { message: "Algún jugador ya tiene pareja, vuelve a sortear" } });
  }

  if (all) {
    const { error } = await supabase.from("profiles").update({ pair_id: null }).not("pair_id", "is", null);
    if (error) return done(retry, { error });
  }

  for (const g of groups) {
    let pairId = (pairs ?? []).find((p) => p.name === g.name)?.id as string | undefined;
    if (!pairId) {
      const { data, error } = await supabase.from("pairs").insert({ name: g.name }).select("id").single();
      if (error || !data) return done(retry, { error });
      pairId = data.id as string;
    }
    const { error } = await supabase.from("profiles").update({ pair_id: pairId }).in("id", [g.a, g.b]);
    if (error) return done(retry, { error });
  }

  done("/admin/parejas", {
    ok: `${groups.length} parejas formadas al azar. Puedes cambiarles el nombre entrando en cada una.`,
  });
}
