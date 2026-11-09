import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { requireOrganizer } from "@/lib/session";
import ShareImageButton from "@/components/ShareImageButton";
import { siteUrl } from "@/lib/site-url";
import { POLL_COLUMNS, addHoursLocal, pollOnHome, pollOpen, type Poll } from "@/lib/polls";
import { NEWS_MATCHUPS_KEY, NEWS_RESULTS_KEY, newsEnabled } from "@/lib/news";
import { HOME_MODE_KEY, WELCOME_KEY, type HomeMode } from "@/lib/welcome";
import { nowInSpain } from "@/lib/weeks";
import { saveHomeMode } from "./actions";

export default async function BienvenidaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { error, ok } = await searchParams;
  const { data } = await supabase
    .from("site_texts")
    .select("key, body")
    .in("key", [WELCOME_KEY, HOME_MODE_KEY, NEWS_MATCHUPS_KEY, NEWS_RESULTS_KEY])
    .returns<{ key: string; body: string }[]>();
  const get = (key: string) => data?.find((r) => r.key === key)?.body;
  const text = data?.find((r) => r.key === WELCOME_KEY)?.body ?? "";
  const mode: HomeMode = get(HOME_MODE_KEY) === "noticias" ? "noticias" : "texto";
  const now = nowInSpain();
  // Encuestas que salen ahora como tarjeta en el inicio, y noticias activadas.
  const [{ data: polls }, { count: customOn }, { count: customAll }] = await Promise.all([
    supabase
      .from("polls")
      .select(POLL_COLUMNS)
      .gte("closes_at", addHoursLocal(now, -720))
      .order("closes_at")
      .returns<Poll[]>(),
    supabase.from("news_items").select("id", { count: "exact", head: true }).eq("visible", true),
    supabase.from("news_items").select("id", { count: "exact", head: true }),
  ]);
  const onHome = (polls ?? []).filter((p) => pollOnHome(p, now));
  const fixedOn = [NEWS_MATCHUPS_KEY, NEWS_RESULTS_KEY].filter((k) => newsEnabled(get(k))).length;
  const invite = `${await siteUrl()}/unete`;

  const option =
    "flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 has-[:checked]:border-lime-400 has-[:checked]:bg-lime-50 dark:border-gray-800 dark:has-[:checked]:bg-neutral-900";

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold">Pantalla de inicio</h1>
        <p className="mb-4 text-sm opacity-70">
          Elige qué ven todos los jugadores al entrar en la web. Las encuestas salen solas, como
          tarjetas, encima de todo.
        </p>
        <Notice ok={ok} error={error} />
        <form action={saveHomeMode} className="flex flex-col gap-4">
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">En el inicio mostrar</legend>
            <label className={option}>
              <input type="radio" name="modo" value="texto" defaultChecked={mode === "texto"} className="mt-1" />
              <span>
                <span className="block font-semibold">✍️ El texto de bienvenida</span>
                <span className="block text-sm opacity-70">El que escribas en Texto de bienvenida.</span>
              </span>
            </label>
            <label className={option}>
              <input type="radio" name="modo" value="noticias" defaultChecked={mode === "noticias"} className="mt-1" />
              <span>
                <span className="block font-semibold">📰 Noticias</span>
                <span className="block text-sm opacity-70">
                  Las que tengas activadas en Noticias. Si no hay ninguna que mostrar, sale el texto de bienvenida.
                </span>
              </span>
            </label>
          </fieldset>

          <SubmitButton className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
            Guardar
          </SubmitButton>
        </form>

        <section className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="mb-1 font-semibold">✍️ Texto de bienvenida</h2>
          <p className="mb-3 line-clamp-3 whitespace-pre-line text-sm opacity-70">
            {text.trim() || "Todavía no hay texto: se muestra «¡Bienvenidos al Torneo Pádel Loyola! 🎾»."}
          </p>
          <Link
            href="/admin/bienvenida/texto"
            className="inline-block rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white"
          >
            Entrar en Texto de bienvenida
          </Link>
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="mb-1 font-semibold">🗳️ Encuestas</h2>
          <p className="mb-3 text-sm opacity-70">
            Crea una encuesta nueva y consulta las publicadas anteriormente con su resultado.
          </p>
          {onHome.length > 0 ? (
            <ul className="mb-3 text-sm">
              {onHome.map((p) => (
                <li key={p.id}>
                  <span className="font-semibold">{pollOpen(p, now) ? "Abierta:" : "Mostrando el resultado:"}</span>{" "}
                  {p.question}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm opacity-70">Ahora no sale ninguna encuesta en el inicio.</p>
          )}
          <Link
            href="/admin/bienvenida/encuestas"
            className="inline-block rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white"
          >
            Entrar en Encuestas
          </Link>
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="mb-1 font-semibold">📰 Noticias</h2>
          <p className="mb-3 text-sm opacity-70">
            Enfrentamientos de la semana, resultados de la última jornada y noticias escritas por los
            organizadores. Se muestran {fixedOn + (customOn ?? 0)} de {2 + (customAll ?? 0)}
            {mode !== "noticias" && ", pero ahora el inicio muestra el texto de bienvenida"}.
          </p>
          <Link
            href="/admin/bienvenida/noticias"
            className="inline-block rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white"
          >
            Entrar en Noticias
          </Link>
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="mb-1 font-semibold">📨 Invitar a nuevos jugadores</h2>
          <p className="mb-3 text-sm opacity-70">
            Envía por WhatsApp la invitación a quien quieras. Lleva un enlace que abre directamente la
            pantalla de crear cuenta: {invite}
          </p>
          <ShareImageButton
            text={`🎾 *¡Únete al Torneo Pádel Loyola!* 🎾\nBuscamos nuevos jugadores. Crea tu usuario en un minuto y, al entrar, marca cuándo puedes jugar: el sorteo se encarga del resto 😎\n👉 ${invite}`}
            imageUrl="/unete/cartel"
            fileName="invitacion.png"
            label="Invitar por WhatsApp"
          />
        </section>
      </main>
    </>
  );
}
