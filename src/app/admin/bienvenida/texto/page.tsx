import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import SubmitButton from "@/components/SubmitButton";
import { requireOrganizer } from "@/lib/session";
import { HOME_MODE_KEY, WELCOME_KEY } from "@/lib/welcome";
import { saveWelcomeText } from "../actions";

export default async function TextoBienvenidaPage({
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
  const showsText = data?.find((r) => r.key === HOME_MODE_KEY)?.body !== "noticias";

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/bienvenida" className="text-sm opacity-70 hover:underline">
          ← Pantalla de inicio
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">✍️ Texto de bienvenida</h1>
        <p className="mb-4 text-sm opacity-70">
          {showsText
            ? "Es lo que ven ahora los jugadores en el inicio."
            : "Ahora el inicio muestra las noticias; este texto sale solo cuando no hay ninguna noticia que mostrar."}{" "}
          Los saltos de línea se respetan.
        </p>
        <Notice ok={ok} error={error} />
        <form action={saveWelcomeText} className="flex flex-col gap-3">
          <textarea
            name="body"
            defaultValue={text}
            rows={12}
            className="w-full rounded-lg border border-gray-300 p-3 text-black"
            placeholder="Escribe aquí el texto de bienvenida"
          />
          <SubmitButton className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
            Guardar
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
