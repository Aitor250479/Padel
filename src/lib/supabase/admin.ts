import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Cliente con la clave secreta de Supabase, para crear, bloquear y borrar
 * cuentas de acceso. SOLO se usa en acciones de servidor después de
 * comprobar que quien lo pide es organizador. Nunca en el navegador.
 *
 * La clave se configura en Vercel como SUPABASE_SERVICE_ROLE_KEY (sin
 * NEXT_PUBLIC_, para que no llegue nunca al navegador).
 */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;
  return createClient(supabaseConfig().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const MISSING_ADMIN_KEY =
  "Falta configurar la clave secreta de Supabase (SUPABASE_SERVICE_ROLE_KEY) en Vercel.";
