import Link from "next/link";
import Header from "@/components/Header";
import Scoreboard from "@/components/Scoreboard";
import Image from "next/image";
import { currentLeague, onlyLeague } from "@/lib/leagues";
import { loadPairDirectory } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { HOME_MODE_KEY, WELCOME_KEY } from "@/lib/welcome";
import { formatWeekLong } from "@/lib/weeks";

type News = {
  id: string;
  week_start: string;
  pair_a: string;
  pair_b: string;
  sets_a: number;
  sets_b: number;
  score_detail: string | null;
};

export default async function Home() {
  const { supabase, profile } = await requireProfile();
  const { data: texts } = await supabase
    .from("site_texts")
    .select("key, body")
    .in("key", [WELCOME_KEY, HOME_MODE_KEY])
    .returns<{ key: string; body: string }[]>();
  const showNews = texts?.find((t) => t.key === HOME_MODE_KEY)?.body === "noticias";
  const text =
    texts?.find((t) => t.key === WELCOME_KEY)?.body?.trim() || "¡Bienvenidos al Torneo Pádel Loyola! 🎾";

  let news: News[] = [];
  let directory: Awaited<ReturnType<typeof loadPairDirectory>> | null = null;
  if (showNews) {
    const league = await currentLeague(supabase);
    const [{ data }, dir] = await Promise.all([
      onlyLeague(
        supabase.from("matches").select("id, week_start, pair_a, pair_b, sets_a, sets_b, score_detail"),
        league,
      )
        .not("sets_a", "is", null)
        .neq("status", "cancelado")
        .order("result_at", { ascending: false, nullsFirst: false })
        .order("week_start", { ascending: false })
        .limit(5)
        .returns<News[]>(),
      loadPairDirectory(supabase),
    ]);
    news = data ?? [];
    directory = dir;
  }

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {showNews && directory ? (
          <section>
            <h1 className="mb-4 text-center text-2xl font-black uppercase italic tracking-tight">
              📰 Últimos resultados
            </h1>
            {news.length ? (
              <div className="flex flex-col gap-6">
                {news.map((m) => (
                  <Scoreboard
                    key={m.id}
                    caption={`Semana del ${formatWeekLong(m.week_start)}`}
                    detail={m.score_detail}
                    a={{ name: directory.pairName(m.pair_a), players: directory.playersOf(m.pair_a), sets: m.sets_a }}
                    b={{ name: directory.pairName(m.pair_b), players: directory.playersOf(m.pair_b), sets: m.sets_b }}
                  />
                ))}
              </div>
            ) : (
              <Image
                src="/sinresultados.png"
                alt="La liga aún no ha empezado. Todavía no hay resultados"
                width={1000}
                height={333}
                className="h-auto w-full"
                priority
              />
            )}
          </section>
        ) : (
          <section className="whitespace-pre-line rounded-2xl border-l-4 border-lime-400 bg-neutral-50 p-5 text-lg leading-relaxed shadow-sm dark:bg-neutral-900">
            {text}
          </section>
        )}

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
