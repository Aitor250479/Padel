import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";
import NewsTextarea from "@/components/NewsTextarea";
import { BreakingNews } from "@/components/NewsPosters";
import { requireOrganizer } from "@/lib/session";
import { currentLeague, onlyLeague } from "@/lib/leagues";
import {
  FIXED_MATCHUPS,
  FIXED_NEWS_KEYS,
  FIXED_NEXT_MATCHUPS,
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
  newsVariants,
  type NewsItem,
} from "@/lib/news";
import { HOME_MODE_KEY } from "@/lib/welcome";
import { addDays, currentWeek, formatWeekLong, nowInSpain } from "@/lib/weeks";
import { createNews, deleteNews, moveNews, toggleFixedNews, toggleNews, updateNews } from "./actions";

const field = "w-full rounded-lg border border-gray-300 px-3 py-2 text-black";

/** Interruptor que envía el formulario con el valor contrario. */
function Switch({ on, label }: { on: boolean; label: string }) {
  return (
    <SubmitButton
      name="on"
      value={on ? "0" : "1"}
      aria-label={`${on ? "Desactivar" : "Activar"}: ${label}`}
      pendingText=""
      className={`relative inline-flex h-7 w-12 items-center justify-center shrink-0 rounded-full transition-colors ${on ? "bg-lime-600" : "bg-gray-300 dark:bg-neutral-700"}`}
    >
      <span
        aria-hidden
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`}
      />
    </SubmitButton>
  );
}

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { error, ok } = await searchParams;
  const thisWeek = currentWeek();
  const lastWeek = addDays(thisWeek, -7);
  const nextWeek = addDays(thisWeek, 7);
  const now = nowInSpain();
  const league = await currentLeague(supabase);
  type Row = { sets_a: number | null; booking_at: string | null };
  const week = (w: string) =>
    onlyLeague(supabase.from("matches").select("sets_a, booking_at"), league)
      .eq("week_start", w)
      .neq("status", "cancelado")
      .returns<Row[]>()
      .then(({ data }) => data ?? []);
  const [{ data: texts }, { data: items }, current, next, last] = await Promise.all([
    supabase
      .from("site_texts")
      .select("key, body")
      .in("key", [HOME_MODE_KEY, ...FIXED_NEWS_KEYS, NEWS_ORDER_KEY])
      .returns<{ key: string; body: string }[]>(),
    supabase
      .from("news_items")
      .select("id, body, visible, created_at")
      .order("created_at", { ascending: false })
      .returns<NewsItem[]>(),
    week(thisWeek),
    week(nextWeek),
    week(lastWeek),
  ]);
  const played = (rows: Row[]) => rows.filter((m) => m.sets_a !== null).length;
  const matchups = current.filter((m) => matchPending(m, now)).length;
  const nextMatchups = next.filter((m) => m.sets_a === null).length;
  const partidos = (n: number) => `${n} ${n === 1 ? "partido" : "partidos"}`;
  const resultados = (n: number) => `${n} ${n === 1 ? "resultado confirmado" : "resultados confirmados"}`;
  const get = (key: string) => texts?.find((t) => t.key === key)?.body;
  const showsNews = get(HOME_MODE_KEY) === "noticias";

  const variants = newsVariants(items ?? []);
  const order = newsOrder(
    get(NEWS_ORDER_KEY),
    (items ?? []).map((n) => n.id),
  );
  const fixed = [
    {
      id: FIXED_MATCHUPS,
      key: NEWS_MATCHUPS_KEY,
      icon: "⚔️",
      title: "Enfrentamientos de la semana",
      text: `${partidos(matchups)} por jugar en la semana del ${formatWeekLong(thisWeek)}. Cada partido deja de salir cuando pasa su fecha y hora.`,
    },
    {
      id: FIXED_NEXT_MATCHUPS,
      key: NEWS_NEXT_MATCHUPS_KEY,
      icon: "📅",
      title: "Enfrentamientos de la próxima semana",
      text: `${partidos(nextMatchups)} en la semana del ${formatWeekLong(nextWeek)}`,
    },
    {
      id: FIXED_WEEK_RESULTS,
      key: NEWS_WEEK_RESULTS_KEY,
      icon: "🎾",
      title: "Resultados de esta semana",
      text: `${resultados(played(current))} de la semana del ${formatWeekLong(thisWeek)}`,
    },
    {
      id: FIXED_RESULTS,
      key: NEWS_RESULTS_KEY,
      icon: "🏁",
      title: "Resultados de la semana pasada",
      text: `${resultados(played(last))} de la semana del ${formatWeekLong(lastWeek)}`,
    },
  ];

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/bienvenida" className="text-sm opacity-70 hover:underline">
          ← Pantalla de inicio
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">📰 Noticias</h1>
        <p className="mb-4 text-sm opacity-70">
          Activa las que quieras que vean los jugadores en el inicio. Enfrentamientos y resultados
          no salen si no hay partidos que enseñar.
          {!showsNews && (
            <>
              {" "}
              <b>Ahora el inicio muestra el texto de bienvenida:</b> elige Noticias en{" "}
              <Link href="/admin/bienvenida" className="underline">
                Pantalla de inicio
              </Link>{" "}
              para que se vean.
            </>
          )}
        </p>
        <Notice ok={ok} error={error} />

        <p className="mb-2 text-sm opacity-70">
          Salen en el inicio en este orden: usa las flechas para subirlas o bajarlas. Las noticias
          nuevas se añaden al final.
        </p>
        <ol className="mb-6 flex flex-col gap-3">
          {order.map((id, i) => {
            const f = fixed.find((x) => x.id === id);
            const n = items?.find((x) => x.id === id);
            if (!f && !n) return null;
            const on = f ? newsEnabled(get(f.key)) : n!.visible;
            const title = f ? f.title : n!.body;
            return (
              <li key={id} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <form action={moveNews} className="flex shrink-0 flex-col items-center">
                    <input type="hidden" name="id" value={id} />
                    <SubmitButton
                      name="dir"
                      value="up"
                      pendingText=""
                      disabled={i === 0}
                      aria-label={`Subir: ${title}`}
                      className="px-2 text-lg leading-none disabled:opacity-20"
                    >
                      ▲
                    </SubmitButton>
                    <span className="text-xs font-bold opacity-60">{i + 1}</span>
                    <SubmitButton
                      name="dir"
                      value="down"
                      pendingText=""
                      disabled={i === order.length - 1}
                      aria-label={`Bajar: ${title}`}
                      className="px-2 text-lg leading-none disabled:opacity-20"
                    >
                      ▼
                    </SubmitButton>
                  </form>
                  {f ? (
                    <>
                      <span aria-hidden className="text-2xl">
                        {f.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{f.title}</span>
                        <span className="block text-sm opacity-70">{f.text}</span>
                      </span>
                    </>
                  ) : (
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-semibold">📢 Noticia · {on ? "se muestra" : "no se muestra"}</span>
                      <span className="block opacity-70">
                        Creada el {new Date(n!.created_at).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}
                      </span>
                    </span>
                  )}
                  <form action={f ? toggleFixedNews : toggleNews}>
                    {f ? <input type="hidden" name="key" value={f.key} /> : <input type="hidden" name="id" value={id} />}
                    <Switch on={on} label={title} />
                  </form>
                </div>
                {n && (
                  <>
                    <BreakingNews text={n.body} variant={variants.get(n.id) ?? 0} />
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold underline">Editar o borrar</summary>
                      <form action={updateNews} className="mt-2 flex flex-col gap-2">
                        <input type="hidden" name="id" value={n.id} />
                        <NewsTextarea defaultValue={n.body} className={field} />
                        <div className="flex flex-wrap gap-2">
                          <SubmitButton className="rounded-lg bg-gray-800 px-3 py-2 font-semibold text-white">
                            Guardar
                          </SubmitButton>
                          <ConfirmButton
                            formAction={deleteNews}
                            message="¿Borrar esta noticia? No se puede deshacer."
                            className="rounded-lg border border-red-600 px-3 py-2 font-semibold text-red-700 dark:text-red-400"
                          >
                            Borrar
                          </ConfirmButton>
                        </div>
                      </form>
                    </details>
                  </>
                )}
              </li>
            );
          })}
        </ol>

        <form action={createNews} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="font-semibold">Noticia nueva</h2>
          <p className="text-sm opacity-70">Sale en el cartel de Breaking news. Se activa al publicarla.</p>
          <NewsTextarea className={field} />
          <SubmitButton className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
            Publicar
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
