// Noticias del inicio. Sin imports de ejecución para poder probarlo con node.

/** Interruptores de las dos noticias fijas (en site_texts, "0" = no se muestra). */
export const NEWS_MATCHUPS_KEY = "noticias_enfrentamientos";
export const NEWS_RESULTS_KEY = "noticias_resultados";

export const NEWS_MAX = 150;

export type NewsItem = { id: string; body: string; visible: boolean; created_at: string };

export function newsEnabled(value: string | undefined) {
  return value !== "0";
}

/** Tamaño de letra (en cqw) del texto de una noticia: más grande cuanto más corta. */
export function breakingFontSize(text: string) {
  const n = [...text].length;
  if (n <= 50) return 5.4;
  if (n <= 80) return 4.8;
  if (n <= 110) return 4.4;
  return 3.8;
}

/**
 * Tamaño de letra (en cqw) para que un nombre quepa en una casilla de `width`
 * cqw. Nunca baja de `min`: si aun así no cabe, se corta con puntos suspensivos.
 */
export function fitFontSize(text: string, width: number, max: number, min = 2.2) {
  const n = Math.max(1, [...text].length);
  // Mayúsculas en negrita cursiva: unos 0,72 em de ancho por letra.
  return Math.max(min, Math.min(max, width / (n * 0.72)));
}

/** Orden de las noticias en el inicio (ids separados por comas, en site_texts). */
export const NEWS_ORDER_KEY = "noticias_orden";
/** Ids de las dos noticias fijas dentro del orden. */
export const FIXED_MATCHUPS = "enfrentamientos";
export const FIXED_RESULTS = "resultados";

/**
 * Orden completo: el guardado, sin ids que ya no existen, y al final lo que
 * falte (por defecto las dos fijas y luego las propias, de la más nueva a la más antigua).
 */
export function newsOrder(saved: string | undefined, customIds: string[]) {
  const all = [FIXED_MATCHUPS, FIXED_RESULTS, ...customIds];
  const kept = [...new Set((saved ?? "").split(",").filter((id) => all.includes(id)))];
  return [...kept, ...all.filter((id) => !kept.includes(id))];
}

/** Sube (-1) o baja (+1) una noticia un puesto. */
export function moveInOrder(order: string[], id: string, dir: -1 | 1) {
  const i = order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
