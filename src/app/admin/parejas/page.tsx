import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { displayName, requireOrganizer, type Pair, type Profile } from "@/lib/session";
import { createPair } from "./actions";
import { button, input, rowLink } from "./ui";

export default async function ParejasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { error, ok } = await searchParams;

  const [{ data: pairs }, { data: players }] = await Promise.all([
    supabase.from("pairs").select("id, name").order("name").returns<Pair[]>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, pair_id")
      .order("full_name")
      .returns<Profile[]>(),
  ]);

  const playersOf = (pairId: string) => (players ?? []).filter((p) => p.pair_id === pairId);
  const unassigned = (players ?? []).filter((p) => !p.pair_id);

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Parejas y jugadores</h1>
        <Notice ok={ok} error={error} />

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Parejas ({pairs?.length ?? 0})</h2>
          <ul className="mb-3 grid gap-2 sm:grid-cols-2">
            {(pairs ?? []).map((pair) => {
              const members = playersOf(pair.id);
              return (
                <li key={pair.id}>
                  <Link href={`/admin/parejas/${pair.id}`} className={rowLink}>
                    <span className="min-w-0">
                      <span className="block font-semibold">{pair.name}</span>
                      <span className="block truncate text-sm opacity-70">
                        {members.length ? members.map((m) => displayName(m)).join(" y ") : "Sin jugadores"}
                      </span>
                    </span>
                    {members.length < 2 && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        {members.length === 1 ? "Falta 1" : "Vacía"}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400">
              ➕ Crear pareja
            </summary>
            <form action={createPair} className="mt-2 flex gap-2">
              <input name="name" required placeholder="Nombre de la pareja" className={`${input} flex-1`} />
              <button className={button}>Crear</button>
            </form>
          </details>
        </section>

        <section className="mb-8 rounded-xl border border-lime-400 bg-lime-50 p-4 dark:bg-neutral-900">
          <h2 className="mb-1 font-semibold">🎲 Crear parejas al azar</h2>
          <p className="mb-3 text-sm opacity-70">
            Verás primero cómo quedarían y podrás confirmarlas o volver a sortear.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/parejas/sorteo?modo=sin" className={button}>
              Con los jugadores sin pareja ({unassigned.length})
            </Link>
            <Link
              href="/admin/parejas/sorteo?modo=todos"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold dark:bg-transparent"
            >
              Rehacer todas las parejas ({players?.length ?? 0} jugadores)
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-lg font-semibold">Jugadores sin pareja ({unassigned.length})</h2>
          <p className="mb-3 text-sm opacity-70">
            Aparecen aquí cuando se dan de alta en la web. Entra en uno para asignarle pareja.
          </p>
          {unassigned.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {unassigned.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/jugadores/${p.id}`} className={rowLink}>
                    <span className="min-w-0">
                      <span className="block font-semibold">{displayName(p)}</span>
                      <span className="block truncate text-xs opacity-60">{p.email}</span>
                    </span>
                    <span aria-hidden className="opacity-50">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-70">Todos los jugadores tienen pareja. 🎉</p>
          )}
        </section>
      </main>
    </>
  );
}
