import Link from "next/link";
import Header from "@/components/Header";
import Image from "next/image";
import Carousel from "@/components/Carousel";
import { BreakingNews, MatchupPoster, ResultPoster } from "@/components/NewsPosters";
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
import { POLL_COLUMNS, addHoursLocal, pollOnHome, pollTodo, type Poll } from "@/lib/polls";
import {
  FIXED_MATCHUPS,
  FIXED_NEXT_MATCHUPS,
  FIXED_NEWS_KEYS,
  FIXED_RESULTS,
  FIXED_WEEK_RESULTS,
  NEWS_MATCHUPS_KEY,
  NEWS_NEXT_MATCHUPS_KEY,
  NEWS_ORDER_KEY,
  NEWS_RESULTS_KEY,
  NEWS_WEEK_RESULTS_KEY,
  matchPending,
  newsEnabled,
  newsOrder,
  newsVariant,
  type NewsItem,
} from "@/lib/news";
import Notice from "@/components/Notice";
import FriendlyPoster from "@/components/FriendlyPoster";
import {
  RECENT_DAYS,
  daysBefore,
  friendlyTodos,
  hasResult,
  homeFriendlies,
  lineup,
  type FriendlyMatch,
  type FriendlyPlayer,
} from "@/lib/friendlies";
import { loadFriendlies, loadPeople } from "@/lib/friendlies-data";
import { addDays, currentWeek, defaultWeek, formatWeekLong, nowInSpain } from "@/lib/weeks";

export default async function Home({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const notice = await searchParams;
  // Desactivado: entra a consultar, con su imagen arriba y sin tareas pendientes.
  const inactive = profile.active === false;
  const { data: texts } = await supabase
    .from("site_texts")
    .select("key, body")
    .in("key", [WELCOME_KEY, HOME_MODE_KEY, ...FIXED_NEWS_KEYS, NEWS_ORDER_KEY])
    .returns<{ key: string; body: string }[]>();
  const get = (key: string) => texts?.find((t) => t.key === key)?.body;
  const showNews = get(HOME_MODE_KEY) === "noticias";
  const text = get(WELCOME_KEY)?.trim() || "¡Bienvenidos al Torneo Pádel Loyola! 🎾";
  const now = nowInSpain();
  const thisWeek = currentWeek();
  const lastWeek = addDays(thisWeek, -7);
  const nextWeek = addDays(thisWeek, 7);
  const on = (key: string) => showNews && newsEnabled(get(key));

  const [league, directory] = await Promise.all([currentLeague(supabase), loadPairDirectory(supabase)]);
  const weekMatches = (week: string) =>
    onlyLeague(supabase.from("matches").select(MATCH_COLUMNS), league)
      .eq("week_start", week)
      .neq("status", "cancelado")
      .order("booking_at", { ascending: true, nullsFirst: false })
      .returns<Match[]>()
      .then(({ data }) => data ?? []);
  // Lo pendiente del jugador, las encuestas y las noticias se cargan a la vez.
  const withResult = (ms: Match[]) => ms.filter((m) => m.sets_a !== null && m.sets_b !== null);
  const none = Promise.resolve([] as Match[]);
  const [todos, polls, thisWeekMatches, nextMatches, lastMatches, items, friendlies, people] = await Promise.all([
    profile.active !== false && (directory.pairsOf(profile).length || isIndividual(league))
      ? loadTodos(supabase, profile, directory.pairsOf(profile), league, directory)
      : Promise.resolve([]),
    loadPollTodos(supabase, profile, now),
    on(NEWS_MATCHUPS_KEY) || on(NEWS_WEEK_RESULTS_KEY) ? weekMatches(thisWeek) : none,
    on(NEWS_NEXT_MATCHUPS_KEY) ? weekMatches(nextWeek) : none,
    on(NEWS_RESULTS_KEY) ? weekMatches(lastWeek) : none,
    showNews
      ? supabase
          .from("news_items")
          .select("id, body, visible, created_at")
          .eq("visible", true)
          .order("created_at", { ascending: false })
          .returns<NewsItem[]>()
          .then(({ data }) => data ?? [])
      : Promise.resolve([] as NewsItem[]),
    loadFriendlies(supabase, { since: daysBefore(now, RECENT_DAYS) }),
    loadPeople(supabase),
  ]);
  const cards = [
    ...todos,
    ...friendlyTodos(profile.id, friendlies.matches, friendlies.players, now, formatBooking),
    ...polls,
  ];
  const friendly = homeFriendlies(friendlies.matches, friendlies.players, now);
  // Enfrentamientos: solo los que faltan por jugar. Resultados: solo los confirmados.
  const matchups = on(NEWS_MATCHUPS_KEY) ? thisWeekMatches.filter((m) => matchPending(m, now)) : [];
  const nextMatchups = nextMatches.filter((m) => m.sets_a === null);
  const weekResults = on(NEWS_WEEK_RESULTS_KEY) ? withResult(thisWeekMatches) : [];
  const lastResults = withResult(lastMatches);
  const hasNews = matchups.length + nextMatchups.length + weekResults.length + lastResults.length + items.length > 0;
  const place = (m: Match) =>
    m.booking_place || m.booking_at
      ? `📍 ${[m.booking_place, formatBooking(m.booking_at)].filter(Boolean).join(" · ")}`
      : "📍 Pendiente de reservar";
  const matchupNews = (id: string, title: string, week: string, list: Match[]) =>
    list.length > 0 && (
      <section key={id}>
        <h1 className={newsTitle}>{title}</h1>
        <p className={newsSub}>Semana del {formatWeekLong(week)}</p>
        <Carousel label={title}>
          {list.map((m, i) => (
            <MatchupPoster
              key={m.id}
              variant={i}
              a={directory.memberNames(m.pair_a)}
              b={directory.memberNames(m.pair_b)}
              caption={[
                ...(directory.isLeaguePair(m.pair_a)
                  ? []
                  : [`${directory.pairName(m.pair_a)} vs ${directory.pairName(m.pair_b)}`]),
                place(m),
              ]}
            />
          ))}
        </Carousel>
      </section>
    );
  const resultNews = (id: string, title: string, week: string, list: Match[]) =>
    list.length > 0 && (
      <section key={id}>
        <h1 className={newsTitle}>{title}</h1>
        <p className={newsSub}>Semana del {formatWeekLong(week)}</p>
        <Carousel label={title}>
          {list.map((m, i) => (
            <ResultPoster
              key={m.id}
              variant={i}
              detail={m.score_detail}
              a={{ name: directory.pairName(m.pair_a), players: directory.memberNames(m.pair_a), sets: m.sets_a! }}
              b={{ name: directory.pairName(m.pair_b), players: directory.memberNames(m.pair_b), sets: m.sets_b! }}
            />
          ))}
        </Carousel>
      </section>
    );

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
        {cards.length > 0 && <TodoList todos={cards} />}
        <Notice ok={notice.ok} error={notice.error} />

        {showNews && hasNews ? (
          <div className="flex flex-col gap-8">
            {newsOrder(
              get(NEWS_ORDER_KEY),
              items.map((n) => n.id),
            ).map((id) => {
              if (id === FIXED_MATCHUPS)
                return matchupNews(id, "Enfrentamientos de la semana", thisWeek, matchups);
              if (id === FIXED_NEXT_MATCHUPS)
                return matchupNews(id, "Enfrentamientos de la próxima semana", nextWeek, nextMatchups);
              if (id === FIXED_WEEK_RESULTS)
                return resultNews(id, "Resultados de esta semana", thisWeek, weekResults);
              if (id === FIXED_RESULTS) return resultNews(id, "Resultados de la semana pasada", lastWeek, lastResults);
              const n = items.find((x) => x.id === id);
              return n && <BreakingNews key={id} text={n.body} variant={newsVariant(n.id)} />;
            })}
          </div>
        ) : (
          <section className="whitespace-pre-line rounded-2xl border-l-4 border-lime-400 bg-neutral-50 p-5 text-lg leading-relaxed shadow-sm dark:bg-neutral-900">
            {text}
          </section>
        )}

        <FriendliesOnHome {...friendly} players={friendlies.players} nameOf={people.nameOf} />

        {!inactive && ((!profile.pair_id && !isIndividual(league)) || !profile.full_name) && (
          <div className="mt-4 flex flex-col gap-1 text-sm opacity-80">
            {!profile.pair_id && !isIndividual(league) && (
              <p>Todavía no tienes pareja asignada. Un organizador te la asignará pronto.</p>
            )}
            {!profile.full_name && (
              <p>
                Pon tu nombre en{" "}
                <Link href="/perfil" className="underline">
                  Mi perfil
                </Link>{" "}
                para que los demás te reconozcan.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}

const newsTitle =
  "text-center text-2xl font-black uppercase italic tracking-tight after:mx-auto after:mt-1.5 after:block after:h-1 after:w-16 after:rounded-full after:bg-lime-400 after:content-['']";
const newsSub = "mb-2 mt-3 text-center text-xs font-semibold opacity-60";

/** Los tres carruseles de amistosos: con huecos, confirmados y jugados. */
function FriendliesOnHome({
  open,
  confirmed,
  played,
  players,
  nameOf,
}: ReturnType<typeof homeFriendlies> & { players: FriendlyPlayer[]; nameOf: (id: string | null) => string }) {
  const names = (ids: (string | null)[]) => ids.map((id) => (id ? nameOf(id) : null));
  const poster = (m: FriendlyMatch, kind: "open" | "confirmed" | "result" | "noresult", variant: number) => {
    const l = lineup(m, players);
    return (
      <FriendlyPoster
        key={m.id}
        href={`/amistosos/${m.id}`}
        kind={kind}
        variant={variant}
        a={names(l.a)}
        b={names(l.b)}
        when={formatBooking(m.play_at) ?? ""}
        place={m.place}
        score={hasResult(m) ? { a: m.sets_a!, b: m.sets_b!, detail: m.score_detail } : undefined}
      />
    );
  };
  const block = (title: string, sub: string, list: FriendlyMatch[], kind: (m: FriendlyMatch) => Parameters<typeof poster>[1]) =>
    list.length > 0 && (
      <section>
        <h1 className={newsTitle}>{title}</h1>
        <p className={newsSub}>{sub}</p>
        <Carousel label={title}>{list.map((m, i) => poster(m, kind(m), i))}</Carousel>
      </section>
    );
  if (!open.length && !confirmed.length && !played.length) return null;
  return (
    <div className="mt-8 flex flex-col gap-8">
      {block("Amistosos con huecos libres", "¿Te apuntas? Pincha en el partido", open, () => "open")}
      {block("Amistosos confirmados", "Ya están los 4 jugadores", confirmed, () => "confirmed")}
      {block("Amistosos jugados", `Últimos ${RECENT_DAYS} días`, played, (m) => (hasResult(m) ? "result" : "noresult"))}
    </div>
  );
}

type Directory = Awaited<ReturnType<typeof loadPairDirectory>>;

/** Tarjetas de las encuestas abiertas y de las cerradas que aún enseñan su resultado. */
async function loadPollTodos(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  profile: Profile,
  now: string,
): Promise<Todo[]> {
  // El resultado se enseña como mucho 720 horas (30 días) tras el cierre.
  const { data: polls } = await supabase
    .from("polls")
    .select(POLL_COLUMNS)
    .gte("closes_at", addHoursLocal(now, -720))
    .order("closes_at", { ascending: true })
    .returns<Poll[]>();
  const shown = (polls ?? []).filter((p) => pollOnHome(p, now));
  if (!shown.length) return [];
  const { data: mine } = await supabase
    .from("poll_votes")
    .select("poll_id")
    .eq("profile_id", profile.id)
    .in(
      "poll_id",
      shown.map((p) => p.id),
    )
    .returns<{ poll_id: string }[]>();
  // Primero las abiertas, luego los resultados.
  return shown
    .map((p) =>
      pollTodo(p, {
        now,
        voted: !!mine?.some((v) => v.poll_id === p.id),
        canVote: profile.active !== false,
        formatBooking: (at) => formatBooking(at),
      }),
    )
    .filter((t): t is Todo => !!t)
    .sort((a, b) => Number(a.icon === "📊") - Number(b.icon === "📊"));
}

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
