import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

// Supabase (plan gratuito) pausa el proyecto si pasa una semana sin actividad.
// Vercel llama a esta ruta una vez al día (ver "crons" en vercel.json) y hace
// una consulta pequeña a la base de datos para que cuente como actividad.
export const dynamic = "force-dynamic";

export async function GET() {
  const { url, key } = supabaseConfig();
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  // Sin sesión, la seguridad por filas no devuelve datos, pero la consulta
  // llega igualmente a la base de datos.
  const { error } = await supabase.from("leagues").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
