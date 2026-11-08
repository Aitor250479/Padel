import Link from "next/link";
import Header from "@/components/Header";
import Scoreboard from "@/components/Scoreboard";
import Image from "next/image";
import { currentLeague, isIndividual, onlyLeague } from "@/lib/leagues";
import {
  MATCH_COLUMNS,
  PROPOSED_COLUMNS,
  formatBooking,
  loadPairDirectory,
  resultOpen,
  type Match,
  type ProposedResult,
} from "@/lib/matches";
import { myTodos, type Todo } from "@/lib/todo";
import TodoList from "@/components/TodoList";
import { requireProfile, type Profile } from "@/lib/session";
import { HOME_MODE_KEY, WELCOME_KEY } from "@/lib/welcome";
import { POLL_KEY, loadPoll } from "@/lib/polls";
import PollCard from "@/components/PollCard";
import Notice from "@/components/Notice";
import { addDays, currentWeek, defaultWeek, formatWeekLong, nowInSpain } from "@/lib/weeks";

type News = {
  id: string;
  week_start: string;
  pair_a: string;
  pair_b: string;
  sets_a: number;
  sets_b: number;
  score_detail: string | null;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const notice = await searchParams;
  // Desactivado: entra a consultar, con su imagen arriba y sin tareas pendientes.
  const inactive = profile.active === false;
  const { data: texts } = await supabase
    .from("site_texts")
    .select("key, body")
    .in("key", [WELCOME_KEY, HOME_MODE_KEY, POLL_KEY])
    .returns<{ key: string; body: string }[]>();
  const mode = texts?.find((t) => t.key === HOME_MODE_KEY)?.body;
  const showNews = mode === "noticias";
  // Modo encuesta: si la encuesta ya no existe, se vuelve al texto de bienvenida.
  const poll = mode === "encuesta" ? await loadPoll(supabase, texts?.find((t) => t.key === POLL_KEY)?.body) : null;
  const text =
    texts?.find((t) => t.key === WELCOME_KEY)?.body?.trim() || "¡Bienvenidos al Torneo Pádel Loyola! 🎾";

  const [league, directory] = await Promise.all([currentLeague(supabase), loadPairDirectory(supabase)]);
  // Lo pendiente del jugador y las noticias se cargan a la vez.
  const [todos, news] = await Promise.all([
    profile.active !== false && (directory.pairsOf(profile).length || isIndividual(league))
      ? loadTodos(supabase, profile, directory.pairsOf(profile), league, directory)
      : Promise.resolve([]),
    showNews
      ? onlyLeague(
          supabase.from("matches").select("id, week_start, pair_a, pair_b, sets_a, sets_b, score_detail"),
          league,
        )
          .not("sets_a", "is", null)
          .neq("status", "cancelado")
          .order("result_at", { ascending: false, nullsFirst: false })
          .order("week_start", { ascending: false })
          .limit(5)
          .returns<News[]>()
          .then(({ data }) => data ?? [])
      : Promise.resolve([] as News[]),
  ]);

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {inactive && (
          <Image
            src="/jugadordesactivado.png"
            alt="¡Te echamos de menos! ¿Cuándo te animas a jugar?"
            width={1200}
            height={400}
            className="mb-6 h-auto w-full"
            priority
          />
        )}
        {todos.length > 0 && <TodoList todos={todos} />}
        <Notice ok={notice.ok} error={notice.error} />

        {poll ? (
          <PollCard
            poll={poll.poll}
            options={poll.options}
            votes={poll.votes}
            me={profile.id}
            now={nowInSpain()}
            canVote={!inactive}
          />
        ) : showNews ? (
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

        {!inactive && ((!profile.pair_id && !isIndividual(league)) || !profile.full_name) && (
          <div className="mt-4 flex flex-col gap-1 text-sm opacity-80">
            {!profile.pair_id && !isIndividual(league) && <p>Todavía no tienes pareja asignada. Un organizador te la asignará pronto.</p>}
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

type Directory = Awaited<ReturnType<typeof loadPairDirectory>>;

/** Lo que el jugador tiene pendiente: resultados, próximos partidos y disponibilidad. */
async function loadTodos(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  profile: Profile,
  pairIds: string[],
  league: Awaited<ReturnType<typeof currentLeague>>,
  directory: Directory,
): Promise<Todo[]> {
  const thisWeek = currentWeek();
  const availabilityWeek = defaultWeek();
  const [{ data: matches }, { data: answer }] = await Promise.all([
    !pairIds.length
      ? Promise.resolve({ data: [] as Match[] })
      : onlyLeague(
      supabase
        .from("matches")
        .select(MATCH_COLUMNS)
        .or(`pair_a.in.(${pairIds.join(",")}),pair_b.in.(${pairIds.join(",")})`)
        .neq("status", "cancelado")
        .is("sets_a", null),
      league,
    ).returns<Match[]>(),
    supabase
      .from("player_availability")
      .select("can_play")
      .eq("profile_id", profile.id)
      .eq("week_start", availabilityWeek)
      .maybeSingle(),
  ]);
  const ids = (matches ?? []).map((m) => m.id);
  const { data: proposals } = ids.length
    ? await supabase.from("match_results").select(PROPOSED_COLUMNS).in("match_id", ids).returns<ProposedResult[]>()
    : { data: [] as ProposedResult[] };
  const now = nowInSpain();
  return myTodos({
    myPair: pairIds[0] ?? "",
    mySide: (m) => directory.sideOf(m, profile) ?? pairIds[0] ?? "",
    thisWeek,
    nextWeek: addDays(thisWeek, 7),
    matches: matches ?? [],
    proposals: proposals ?? [],
    availabilityWeek,
    answered: !!answer,
    isOpen: (m) => resultOpen(m, now),
    pairName: directory.pairName,
    playersOf: directory.playersOf,
    formatBooking,
    formatWeekLong,
  });
}
