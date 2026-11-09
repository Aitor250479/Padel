import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { requireOrganizer } from "@/lib/session";
import ShareImageButton from "@/components/ShareImageButton";
import { siteUrl } from "@/lib/site-url";
import { formatBooking } from "@/lib/matches";
import { POLL_KEY, loadPoll, pollOpen } from "@/lib/polls";
import { HOME_MODE_KEY, WELCOME_KEY, type HomeMode } from "@/lib/welcome";
import { nowInSpain } from "@/lib/weeks";
import { saveWelcome } from "./actions";

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
  const open = current ? pollOpen(current.poll, nowInSpain()) : false;
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
                  La encuesta actual: para votar mientras está abierta y, al cerrarse, su resultado.
                </span>
              </span>
            </label>
          </fieldset>

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

        <section className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="mb-1 font-semibold">🗳️ Encuestas</h2>
          <p className="mb-3 text-sm opacity-70">
            Crea una encuesta nueva y consulta las publicadas anteriormente con su resultado.
          </p>
          {current && (
            <p className="mb-3 text-sm">
              <span className="font-semibold">Actual:</span> {current.poll.question}
              <span className="opacity-70">
                {" · "}
                {open ? `abierta hasta el ${formatBooking(current.poll.closes_at)}` : "cerrada"}
                {mode !== "encuesta" && " · ahora no se muestra en el inicio"}
              </span>
            </p>
          )}
          <Link
            href="/admin/bienvenida/encuestas"
            className="inline-block rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white"
          >
            Entrar en Encuestas
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
