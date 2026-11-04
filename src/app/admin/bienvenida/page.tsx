import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { requireOrganizer } from "@/lib/session";
import { WELCOME_KEY } from "@/lib/welcome";
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
    .select("body")
    .eq("key", WELCOME_KEY)
    .maybeSingle<{ body: string }>();

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold">Texto de Bienvenida</h1>
        <p className="mb-4 text-sm opacity-70">
          Lo que escribas aquí es lo que ven todos los jugadores al entrar en la web. Los saltos de
          línea se respetan.
        </p>
        <Notice ok={ok} error={error} />
        <form action={saveWelcome} className="flex flex-col gap-3">
          <textarea
            name="body"
            defaultValue={data?.body ?? ""}
            rows={12}
            className="w-full rounded-lg border border-gray-300 p-3 text-black"
            placeholder="Escribe aquí el texto de bienvenida"
          />
          <button className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
            Guardar
          </button>
        </form>
      </main>
    </>
  );
}
