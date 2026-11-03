import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  let reason = searchParams.get("error_description") ?? "El enlace no trae código de acceso.";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
    reason = error.message;
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);
}
