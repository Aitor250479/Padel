import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { displayName, requireOrganizer, type Pair, type Profile } from "@/lib/session";
import { assignPlayer, deletePair, renamePair } from "../actions";
import { button, card, input, rowLink } from "../ui";

export default async function PairPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [{ data: pair }, { data: players }] = await Promise.all([
    supabase.from("pairs").select("id, name").eq("id", id).maybeSingle<Pair>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, pair_id")
      .order("full_name")
      .returns<Profile[]>(),
  ]);
  if (!pair) notFound();

  const members = (players ?? []).filter((p) => p.pair_id === pair.id);
  const unassigned = (players ?? []).filter((p) => !p.pair_id);
  const back = `/admin/parejas/${pair.id}`;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/parejas" className="text-sm underline opacity-70">
          ← Parejas y jugadores
        </Link>
        <h1 className="mb-4 mt-2 text-2xl font-bold">{pair.name}</h1>
        <Notice ok={ok} error={error} />

        <section className={`${card} mb-4`}>
          <h2 className="mb-3 font-semibold">Jugadores</h2>
          {members.length ? (
            <ul className="mb-3 flex flex-col gap-2">
              {members.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/jugadores/${m.id}`} className={rowLink}>
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {displayName(m)} {m.is_organizer && <span className="text-xs">⭐</span>}
                      </span>
                      <span className="block truncate text-xs opacity-60">{m.email}</span>
                    </span>
                    <span aria-hidden className="opacity-50">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm opacity-70">Todavía no tiene jugadores.</p>
          )}

          {members.length < 2 &&
            (unassigned.length ? (
              <form action={assignPlayer} className="flex flex-wrap gap-2">
                <input type="hidden" name="pair_id" value={pair.id} />
                <input type="hidden" name="back" value={back} />
                <select name="player_id" required className={`${input} flex-1`} defaultValue="">
                  <option value="" disabled>
                    Elegir jugador sin pareja…
                  </option>
                  {unassigned.map((p) => (
                    <option key={p.id} value={p.id}>
                      {displayName(p)}
                    </option>
                  ))}
                </select>
                <SubmitButton className={button}>Añadir</SubmitButton>
              </form>
            ) : (
              <p className="text-sm opacity-70">No hay jugadores sin pareja para añadir.</p>
            ))}
        </section>

        <section className={`${card} mb-4`}>
          <h2 className="mb-3 font-semibold">Nombre de la pareja</h2>
          <form action={renamePair} className="flex gap-2">
            <input type="hidden" name="id" value={pair.id} />
            <input name="name" defaultValue={pair.name} required className={`${input} flex-1`} />
            <SubmitButton className={button}>Renombrar</SubmitButton>
          </form>
        </section>

        <section className="rounded-xl border border-red-200 p-4 dark:border-red-900">
          <h2 className="mb-1 font-semibold text-red-700 dark:text-red-400">Borrar pareja</h2>
          <p className="mb-3 text-sm opacity-70">
            Sus jugadores quedan sin pareja y se borran sus partidos y resultados.
          </p>
          <form action={deletePair}>
            <input type="hidden" name="id" value={pair.id} />
            <ConfirmButton
              pendingText="Borrando…"
              message={`¿Seguro que quieres borrar la pareja "${pair.name}"? Se borrarán también sus partidos y resultados.`}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Borrar pareja
            </ConfirmButton>
          </form>
        </section>
      </main>
    </>
  );
}
