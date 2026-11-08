import SubmitButton from "@/components/SubmitButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { requireOrganizer } from "@/lib/session";
import PollOptionsFields from "@/components/PollOptionsFields";
import SharePollButton from "@/components/SharePollButton";
import ShareImageButton from "@/components/ShareImageButton";
import { siteUrl } from "@/lib/site-url";
import { formatBooking } from "@/lib/matches";
import { POLL_KEY, loadPoll, pollOpen, pollResults } from "@/lib/polls";
import { HOME_MODE_KEY, WELCOME_KEY, type HomeMode } from "@/lib/welcome";
import { addDays, nowInSpain } from "@/lib/weeks";
import { saveWelcome, updatePollClose } from "./actions";

const field = "rounded-lg border border-gray-300 px-3 py-2 text-black";

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
    .in("key", [WELCOME_KEY, HOME_MODE_KEY, POLL_KEY])
    .returns<{ key: string; body: string }[]>();
  const text = data?.find((r) => r.key === WELCOME_KEY)?.body ?? "";
  const saved = data?.find((r) => r.key === HOME_MODE_KEY)?.body;
  const mode: HomeMode = saved === "noticias" || saved === "encuesta" ? saved : "texto";
  const current = await loadPoll(supabase, data?.find((r) => r.key === POLL_KEY)?.body);
  const now = nowInSpain();
  const open = current ? pollOpen(current.poll, now) : false;
  const results = current && !open ? pollResults(current.options, current.votes) : null;
  // Participación: cuántos jugadores activos han votado (sin saber quién ni qué).
  const participation = current
    ? ((await supabase.rpc("poll_participation", { p: current.poll.id })).data as { voted: number; eligible: number }[] | null)?.[0] ?? null
    : null;
  const tomorrow = addDays(now.slice(0, 10), 1);
  const invite = `${await siteUrl()}/unete`;

  const option =
    "flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 has-[:checked]:border-lime-400 has-[:checked]:bg-lime-50 dark:border-gray-800 dark:has-[:checked]:bg-neutral-900";

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold">Pantalla de inicio</h1>
        <p className="mb-4 text-sm opacity-70">Elige qué ven todos los jugadores al entrar en la web.</p>
        <Notice ok={ok} error={error} />
        <form action={saveWelcome} className="flex flex-col gap-4">
          <fieldset className="grid gap-2 sm:grid-cols-3">
            <legend className="mb-2 font-semibold">En el inicio mostrar</legend>
            <label className={option}>
              <input type="radio" name="modo" value="texto" defaultChecked={mode === "texto"} className="mt-1" />
              <span>
                <span className="block font-semibold">✍️ El texto de bienvenida</span>
                <span className="block text-sm opacity-70">El que escribas aquí abajo.</span>
              </span>
            </label>
            <label className={option}>
              <input type="radio" name="modo" value="noticias" defaultChecked={mode === "noticias"} className="mt-1" />
              <span>
                <span className="block font-semibold">📰 Últimas noticias</span>
                <span className="block text-sm opacity-70">Los 5 últimos resultados confirmados, en marcador.</span>
              </span>
            </label>
            <label className={option}>
              <input type="radio" name="modo" value="encuesta" defaultChecked={mode === "encuesta"} className="mt-1" />
              <span>
                <span className="block font-semibold">🗳️ Encuesta</span>
                <span className="block text-sm opacity-70">
                  Para votar mientras está abierta y, al cerrarse, su resultado.
                </span>
              </span>
            </label>
          </fieldset>

          <section className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="font-semibold">🗳️ Encuesta nueva</h2>
            <p className="text-sm opacity-70">
              Rellénala con la opción Encuesta marcada y pulsa Guardar: sustituye a la encuesta actual
              y pasa a verse en el inicio. Cada jugador vota una vez y puede cambiar su voto hasta el
              cierre; nadie ve los votos de los demás hasta entonces.
            </p>
            <textarea name="question" rows={2} maxLength={300} placeholder="Pregunta" className={field} />
            <PollOptionsFields className={field} />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">Abierta hasta el</span>
              <input type="date" name="closes_day" defaultValue={tomorrow} className={field} />
              <span>a las</span>
              <input type="time" name="closes_time" defaultValue="22:00" className={field} />
            </div>
          </section>

          <label className="flex flex-col gap-1">
            <span className="font-semibold">Texto de bienvenida</span>
            <span className="text-sm opacity-70">Los saltos de línea se respetan.</span>
            <textarea
              name="body"
              defaultValue={text}
              rows={10}
              className="w-full rounded-lg border border-gray-300 p-3 text-black"
              placeholder="Escribe aquí el texto de bienvenida"
            />
          </label>
          <SubmitButton className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
            Guardar
          </SubmitButton>
        </form>

        {current && (
          <section className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="mb-1 font-semibold">Encuesta actual</h2>
            <p className="font-medium">{current.poll.question}</p>
            <p className="mb-3 text-sm opacity-70">
              {open
                ? `Abierta hasta el ${formatBooking(current.poll.closes_at)}. Los votos se verán al cerrarse.`
                : `Cerrada el ${formatBooking(current.poll.closes_at)} · ${results!.total} ${results!.total === 1 ? "voto" : "votos"}`}
              {mode !== "encuesta" && " · Ahora no se muestra en el inicio."}
            </p>
            {participation && (
              <div className="mb-3">
                <p className="text-sm font-semibold">
                  🗳️ {participation.voted}/{participation.eligible} jugadores han votado
                </p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-lime-400"
                    style={{
                      width: `${participation.eligible ? Math.round((participation.voted / participation.eligible) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {results ? (
              <ul className="mb-3 text-sm">
                {results.rows.map((r) => (
                  <li key={r.id}>
                    {r.winner && "🏆 "}
                    {r.label}: <b>{r.count}</b> ({r.percent}%)
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mb-3 list-inside list-disc text-sm">
                {current.options.map((o) => (
                  <li key={o.id}>{o.label}</li>
                ))}
              </ul>
            )}
            {open && (
              <div className="mb-4">
                <SharePollButton
                  text={`🗳️ *¡Nueva encuesta en el Torneo Pádel Loyola!*\n*${current.poll.question}*\n⏳ Vota antes del ${formatBooking(current.poll.closes_at)} 👉 ${await siteUrl()}`}
                />
              </div>
            )}
            <form action={updatePollClose} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={current.poll.id} />
              <span className="font-semibold">{open ? "Cambiar el cierre:" : "Reabrir hasta el"}</span>
              <input type="date" name="closes_day" defaultValue={current.poll.closes_at.slice(0, 10)} className={field} />
              <input type="time" name="closes_time" defaultValue={current.poll.closes_at.slice(11, 16)} className={field} />
              <SubmitButton className="rounded-lg bg-gray-800 px-3 py-2 font-semibold text-white">Guardar</SubmitButton>
              {open && (
                <SubmitButton
                  name="close_now"
                  value="1"
                  className="rounded-lg border border-red-600 px-3 py-2 font-semibold text-red-700 dark:text-red-400"
                >
                  Cerrar ya
                </SubmitButton>
              )}
            </form>
          </section>
        )}

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
