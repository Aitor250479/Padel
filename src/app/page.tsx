import Link from "next/link";
import Header from "@/components/Header";
import { displayName, requireProfile, type Pair, type Profile } from "@/lib/session";

export default async function Home() {
  const { supabase, profile } = await requireProfile();

  let pair: Pair | null = null;
  let partner: Profile | null = null;
  if (profile.pair_id) {
    const [{ data: p }, { data: mates }] = await Promise.all([
      supabase.from("pairs").select("id, name").eq("id", profile.pair_id).single<Pair>(),
      supabase
        .from("profiles")
        .select("id, email, full_name, is_organizer, pair_id")
        .eq("pair_id", profile.pair_id)
        .neq("id", profile.id)
        .returns<Profile[]>(),
    ]);
    pair = p;
    partner = mates?.[0] ?? null;
  }

  const sections: { title: string; text: string; href?: string }[] = [
    {
      title: "Disponibilidad semanal",
      text: "Marca qué días y horas puedes jugar.",
      href: "/disponibilidad",
    },
    {
      title: "Partidos",
      text: "Rival, lugar y hora de la pista reservada.",
      href: "/partidos",
    },
    {
      title: "Clasificación",
      text: "Ganados, empatados, perdidos y puntos.",
      href: "/clasificacion",
    },
  ];

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Hola, {displayName(profile)}</h1>

        <section className="mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          {pair ? (
            <p>
              Juegas en la pareja <b>{pair.name}</b>
              {partner ? (
                <>
                  {" "}
                  con <b>{displayName(partner)}</b>.
                </>
              ) : (
                ". Aún falta asignar a tu compañero o compañera."
              )}
            </p>
          ) : (
            <p>
              Todavía no tienes pareja asignada. Un organizador te la asignará pronto.
            </p>
          )}
          {!profile.full_name && (
            <p className="mt-2 text-sm">
              Pon tu nombre en <Link href="/perfil" className="underline">Mi perfil</Link> para que
              los demás te reconozcan.
            </p>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          {sections.map((s) =>
            s.href ? (
              <Link
                key={s.title}
                href={s.href}
                className="rounded-xl border border-emerald-300 p-4 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
              >
                <h2 className="font-semibold">{s.title}</h2>
                <p className="text-sm">{s.text}</p>
              </Link>
            ) : (
              <div
                key={s.title}
                className="rounded-xl border border-dashed border-gray-300 p-4 opacity-60 dark:border-gray-700"
              >
                <h2 className="font-semibold">{s.title}</h2>
                <p className="text-sm">{s.text}</p>
                <p className="mt-2 text-xs uppercase tracking-wide">Próximamente</p>
              </div>
            ),
          )}
        </div>
      </main>
    </>
  );
}
