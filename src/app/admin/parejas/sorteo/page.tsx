import { randomInt, randomUUID } from "node:crypto";
import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { displayName, requireOrganizer, type Pair, type Profile } from "@/lib/session";
import { applyRandomPairs } from "../actions";
import { button, card } from "../ui";

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function SorteoPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const params = await searchParams;
  const all = params.modo === "todos";

  const [{ data: pairs }, { data: players }] = await Promise.all([
    supabase.from("pairs").select("id, name").order("name").returns<Pair[]>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, pair_id")
      .returns<Profile[]>(),
  ]);

  const candidates = shuffle((players ?? []).filter((p) => all || !p.pair_id));
  const groups: Profile[][] = [];
  for (let i = 0; i + 1 < candidates.length; i += 2) groups.push([candidates[i], candidates[i + 1]]);
  const leftover = candidates.length % 2 ? candidates[candidates.length - 1] : null;

  // Nombres: al rehacer todas, se reutilizan las parejas que ya existen; las que falten
  // se crean como "Pareja N" (se pueden renombrar después).
  const taken = new Set((pairs ?? []).map((p) => p.name));
  const reuse = all ? [...(pairs ?? [])] : [];
  let n = 1;
  const names = groups.map(() => {
    const existing = reuse.shift();
    if (existing) return existing.name;
    while (taken.has(`Pareja ${n}`)) n++;
    taken.add(`Pareja ${n}`);
    return `Pareja ${n}`;
  });

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/parejas" className="text-sm underline opacity-70">
          ← Parejas y jugadores
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">🎲 Parejas al azar</h1>
        <p className="mb-4 text-sm opacity-70">
          {all
            ? "Se deshacen todas las parejas y se vuelven a formar al azar con todos los jugadores."
            : "Se forman parejas nuevas al azar con los jugadores que aún no tienen pareja."}
        </p>
        <Notice error={params.error} />

        {groups.length === 0 ? (
          <p className={card}>
            No hay jugadores suficientes para formar parejas
            {all ? "." : " (hacen falta al menos 2 jugadores sin pareja)."}
          </p>
        ) : (
          <>
            <ul className="mb-4 grid gap-2 sm:grid-cols-2">
              {groups.map((g, i) => (
                <li key={g[0].id} className={card}>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    {names[i]}
                  </p>
                  <p className="font-semibold">
                    {displayName(g[0])} y {displayName(g[1])}
                  </p>
                </li>
              ))}
            </ul>
            {leftover && (
              <p className="mb-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
                Son impares: <b>{displayName(leftover)}</b> se queda sin pareja de momento.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={applyRandomPairs}>
                <input type="hidden" name="modo" value={all ? "todos" : "sin"} />
                {groups.map((g, i) => (
                  <input key={g[0].id} type="hidden" name="grupo" value={`${g[0].id},${g[1].id},${names[i]}`} />
                ))}
                {all ? (
                  <ConfirmButton
                    message="Se deshacen todas las parejas actuales y se ponen estas. ¿Confirmar?"
                    className={button}
                  >
                    ✅ Confirmar parejas
                  </ConfirmButton>
                ) : (
                  <button className={button}>✅ Confirmar parejas</button>
                )}
              </form>
              <Link
                href={`/admin/parejas/sorteo?modo=${all ? "todos" : "sin"}&r=${randomUUID().slice(0, 8)}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold"
              >
                🎲 Rehacer
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
