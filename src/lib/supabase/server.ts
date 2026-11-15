import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/supabase/config";

/** Cookie con la categoría que gestiona un organizador de liga (pestaña Ligas). */
export const CATEGORY_COOKIE = "categoria";

export async function createClient() {
  const cookieStore = await cookies();
  const category = cookieStore.get(CATEGORY_COOKIE)?.value;
  return createServerClient(
    supabaseConfig().url,
    supabaseConfig().key,
    {
      // La base de datos solo la tiene en cuenta si de verdad gestionas esa categoría.
      ...(category && /^[0-9a-f-]{36}$/i.test(category) ? { global: { headers: { "x-categoria": category } } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: el middleware refresca la sesión.
          }
        },
      },
    },
  );
}
