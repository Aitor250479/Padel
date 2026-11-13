"use server";

import { friendlyError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/session";
import { FIXED_NEWS_KEYS, NEWS_MAX, NEWS_ORDER_KEY, groupedNewsOrder, joinNewsOrder, moveInOrder } from "@/lib/news";

const PATH = "/admin/bienvenida/noticias";

function done(params: { ok?: string; error?: string }) {
  revalidatePath("/", "layout");
  const [key, value] = params.error ? ["error", params.error] : ["ok", params.ok ?? ""];
  redirect(`${PATH}?${key}=${encodeURIComponent(value)}`);
}

function cleanBody(formData: FormData) {
  return String(formData.get("body") ?? "").trim();
}

/** Enciende o apaga una de las noticias fijas. */
export async function toggleFixedNews(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const key = String(formData.get("key") ?? "");
  if (!FIXED_NEWS_KEYS.includes(key)) return done({ error: "Noticia desconocida" });
  const on = formData.get("on") === "1";
  const { error } = await supabase
    .from("site_texts")
    .upsert({ key, body: on ? "1" : "0", updated_at: new Date().toISOString(), updated_by: profile.id });
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: on ? "Noticia activada." : "Noticia desactivada." });
}

export async function createNews(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const body = cleanBody(formData);
  if (!body) return done({ error: "Escribe la noticia" });
  if ([...body].length > NEWS_MAX) return done({ error: `La noticia no puede pasar de ${NEWS_MAX} caracteres` });
  const { error } = await supabase.from("news_items").insert({ body });
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: "Noticia publicada." });
}

export async function updateNews(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id") ?? "");
  const body = cleanBody(formData);
  if (!body) return done({ error: "Escribe la noticia" });
  if ([...body].length > NEWS_MAX) return done({ error: `La noticia no puede pasar de ${NEWS_MAX} caracteres` });
  const { error } = await supabase.from("news_items").update({ body }).eq("id", id);
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: "Noticia cambiada." });
}

export async function toggleNews(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id") ?? "");
  const on = formData.get("on") === "1";
  const { error } = await supabase.from("news_items").update({ visible: on }).eq("id", id);
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: on ? "Noticia activada." : "Noticia desactivada." });
}

export async function deleteNews(formData: FormData) {
  const { supabase } = await requireOrganizer();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("news_items").delete().eq("id", id);
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: "Noticia borrada." });
}

/**
 * Sube o baja un puesto una noticia fija o el bloque de noticias propias en el
 * inicio, o una noticia propia dentro de su carrusel (scope=carrusel).
 */
export async function moveNews(formData: FormData) {
  const { supabase, profile } = await requireOrganizer();
  const id = String(formData.get("id") ?? "");
  const dir = formData.get("dir") === "up" ? -1 : 1;
  const [{ data: saved }, { data: items }] = await Promise.all([
    supabase.from("site_texts").select("body").eq("key", NEWS_ORDER_KEY).maybeSingle<{ body: string }>(),
    supabase.from("news_items").select("id").order("created_at", { ascending: false }).returns<{ id: string }[]>(),
  ]);
  const current = groupedNewsOrder(saved?.body, (items ?? []).map((n) => n.id));
  const order =
    formData.get("scope") === "carrusel"
      ? { ...current, custom: moveInOrder(current.custom, id, dir) }
      : { ...current, top: moveInOrder(current.top, id, dir) };
  const { error } = await supabase
    .from("site_texts")
    .upsert({ key: NEWS_ORDER_KEY, body: joinNewsOrder(order), updated_at: new Date().toISOString(), updated_by: profile.id });
  if (error) return done({ error: friendlyError(error.message) });
  done({ ok: "Orden cambiado." });
}
