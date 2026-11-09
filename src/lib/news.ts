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
