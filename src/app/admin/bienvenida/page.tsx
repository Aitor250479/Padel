import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { requireOrganizer } from "@/lib/session";
import { HOME_MODE_KEY, WELCOME_KEY } from "@/lib/welcome";
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
    .in("key", [WELCOME_KEY, HOME_MODE_KEY])
    .returns<{ key: string; body: string }[]>();
  const text = data?.find((r) => r.key === WELCOME_KEY)?.body ?? "";
  const mode = data?.find((r) => r.key === HOME_MODE_KEY)?.body === "noticias" ? "noticias" : "texto";

  const option =
    "flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 has-[:checked]:border-lime-400 has-[:checked]:bg-lime-50 dark:border-gray-800 dark:has-[:checked]:bg-neutral-900";

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold">Texto de Bienvenida</h1>
        <p className="mb-4 text-sm opacity-70">Elige qué ven todos los jugadores al entrar en la web.</p>
        <Notice ok={ok} error={error} />
        <form action={saveWelcome} className="flex flex-col gap-4">
          <fieldset className="grid gap-2 sm:grid-cols-2">
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
          <button className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
            Guardar
          </button>
        </form>
      </main>
    </>
  );
}
