/**
 * URL y clave de Supabase. La URL se reduce a su origen para que funcione aunque
 * se haya pegado con una ruta detrás (por ejemplo ".../rest/v1/").
 */
export function supabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  let url = rawUrl.trim();
  try {
    url = new URL(url).origin;
  } catch {
    // Se deja tal cual; el error saldrá al intentar entrar.
  }
  return { url, key: key.trim() };
}
