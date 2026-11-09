import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";
import NewsTextarea from "@/components/NewsTextarea";
import { BreakingNews } from "@/components/NewsPosters";
import { requireOrganizer } from "@/lib/session";
import { currentLeague, onlyLeague } from "@/lib/leagues";
import { NEWS_MATCHUPS_KEY, NEWS_RESULTS_KEY, newsEnabled, type NewsItem } from "@/lib/news";
import { HOME_MODE_KEY } from "@/lib/welcome";
import { addDays, currentWeek, formatWeekLong } from "@/lib/weeks";
import { createNews, deleteNews, toggleFixedNews, toggleNews, updateNews } from "./actions";

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
  const league = await currentLeague(supabase);
  const count = (week: string, withResult: boolean) => {
    let q = onlyLeague(supabase.from("matches").select("id", { count: "exact", head: true }), league)
      .eq("week_start", week)
      .neq("status", "cancelado");
    if (withResult) q = q.not("sets_a", "is", null);
    return q.then(({ count }) => count ?? 0);
  };
  const [{ data: texts }, { data: items }, matchups, results] = await Promise.all([
    supabase
      .from("site_texts")
      .select("key, body")
      .in("key", [HOME_MODE_KEY, NEWS_MATCHUPS_KEY, NEWS_RESULTS_KEY])
      .returns<{ key: string; body: string }[]>(),
    supabase
      .from("news_items")
      .select("id, body, visible, created_at")
      .order("created_at", { ascending: false })
      .returns<NewsItem[]>(),
    count(thisWeek, false),
    count(lastWeek, true),
  ]);
  const get = (key: string) => texts?.find((t) => t.key === key)?.body;
  const showsNews = get(HOME_MODE_KEY) === "noticias";

  const fixed = [
    {
      key: NEWS_MATCHUPS_KEY,
      icon: "⚔️",
      title: "Enfrentamientos de la semana",
      text: `${matchups} ${matchups === 1 ? "partido" : "partidos"} en la semana del ${formatWeekLong(thisWeek)}`,
    },
    {
      key: NEWS_RESULTS_KEY,
      icon: "🏁",
      title: "Resultados de la última jornada",
      text: `${results} ${results === 1 ? "resultado confirmado" : "resultados confirmados"} de la semana del ${formatWeekLong(lastWeek)}`,
    },
  ];
  const row = "flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800";

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/bienvenida" className="text-sm opacity-70 hover:underline">
          ← Pantalla de inicio
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">📰 Noticias</h1>
        <p className="mb-4 text-sm opacity-70">
          Activa las que quieras que vean los jugadores en el inicio. Una noticia fija sin partidos
          que enseñar no sale.
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

        <h2 className="mb-2 text-xs font-bold uppercase opacity-60">Siempre disponibles</h2>
        <ul className="mb-6 flex flex-col gap-2">
          {fixed.map((f) => {
            const on = newsEnabled(get(f.key));
            return (
              <li key={f.key}>
                <form action={toggleFixedNews} className={row}>
                  <input type="hidden" name="key" value={f.key} />
                  <span aria-hidden className="text-2xl">
                    {f.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{f.title}</span>
                    <span className="block text-sm opacity-70">{f.text}</span>
                  </span>
                  <Switch on={on} label={f.title} />
                </form>
              </li>
            );
          })}
        </ul>

        <h2 className="mb-2 text-xs font-bold uppercase opacity-60">Noticias de los organizadores</h2>
        {!items?.length && <p className="mb-3 text-sm opacity-70">Todavía no habéis escrito ninguna.</p>}
        <ul className="mb-6 flex flex-col gap-3">
          {(items ?? []).map((n) => (
            <li key={n.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <form action={toggleNews} className="flex items-center gap-3">
                <input type="hidden" name="id" value={n.id} />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold">{n.visible ? "Se muestra en el inicio" : "No se muestra"}</span>
                  <span className="block opacity-70">
                    Creada el {new Date(n.created_at).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}
                  </span>
                </span>
                <Switch on={n.visible} label={n.body} />
              </form>
              <BreakingNews text={n.body} />
              <details>
                <summary className="cursor-pointer text-sm font-semibold underline">Editar o borrar</summary>
                <form action={updateNews} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="id" value={n.id} />
                  <NewsTextarea defaultValue={n.body} className={field} />
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton className="rounded-lg bg-gray-800 px-3 py-2 font-semibold text-white">Guardar</SubmitButton>
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
            </li>
          ))}
        </ul>

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
