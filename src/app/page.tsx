import Link from "next/link";
import Header from "@/components/Header";
import { requireProfile } from "@/lib/session";
import { WELCOME_KEY } from "@/lib/welcome";

export default async function Home() {
  const { supabase, profile } = await requireProfile();
  const { data } = await supabase
    .from("site_texts")
    .select("body")
    .eq("key", WELCOME_KEY)
    .maybeSingle<{ body: string }>();
  const text = data?.body?.trim() || "¡Bienvenidos al Torneo Pádel Loyola! 🎾";

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="whitespace-pre-line rounded-2xl border-l-4 border-lime-400 bg-neutral-50 p-5 text-lg leading-relaxed shadow-sm dark:bg-neutral-900">
          {text}
        </section>

        {(!profile.pair_id || !profile.full_name) && (
          <div className="mt-4 flex flex-col gap-1 text-sm opacity-80">
            {!profile.pair_id && <p>Todavía no tienes pareja asignada. Un organizador te la asignará pronto.</p>}
            {!profile.full_name && (
              <p>
                Pon tu nombre en <Link href="/perfil" className="underline">Mi perfil</Link> para que
                los demás te reconozcan.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
