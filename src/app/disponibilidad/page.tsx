import Link from "next/link";
import Header from "@/components/Header";
import { requireProfile, type Pair } from "@/lib/session";
import { addDays, formatWeek, parseWeek, slotKey, weekDays } from "@/lib/weeks";
import AvailabilityGrid from "./AvailabilityGrid";

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const weekStart = parseWeek((await searchParams).semana);
  const days = weekDays(weekStart);

  const [{ data: pairs }, { data: slots }, { data: weeks }] = await Promise.all([
    supabase.from("pairs").select("id, name").order("name").returns<Pair[]>(),
    supabase
      .from("availability")
      .select("pair_id, day, hour")
      .gte("day", days[0])
      .lte("day", days[6])
      .returns<{ pair_id: string; day: string; hour: number }[]>(),
    supabase
      .from("availability_weeks")
      .select("pair_id")
      .eq("week_start", weekStart)
      .returns<{ pair_id: string }[]>(),
  ]);

  const pairName = new Map((pairs ?? []).map((p) => [p.id, p.name]));
  const myPair = profile.pair_id;

  const mine: string[] = [];
  const others: Record<string, string[]> = {};
  for (const s of slots ?? []) {
    const key = slotKey(s.day, s.hour);
    if (s.pair_id === myPair) mine.push(key);
    else (others[key] ??= []).push(pairName.get(s.pair_id) ?? "?");
  }

  const submittedIds = new Set((weeks ?? []).map((w) => w.pair_id));
  const pending = (pairs ?? []).filter((p) => !submittedIds.has(p.id));
  const cantPlay = (pairs ?? []).filter(
    (p) => submittedIds.has(p.id) && !(slots ?? []).some((s) => s.pair_id === p.id),
  );

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold">Disponibilidad</h1>
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Link href={`/disponibilidad?semana=${addDays(weekStart, -7)}`} className="underline">
            ← Anterior
          </Link>
          <span className="font-semibold">Semana del {formatWeek(weekStart)}</span>
          <Link href={`/disponibilidad?semana=${addDays(weekStart, 7)}`} className="underline">
            Siguiente →
          </Link>
        </div>

        {!myPair && (
          <p className="mb-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
            Aún no tienes pareja asignada, así que solo puedes ver la disponibilidad de los demás.
          </p>
        )}

        <AvailabilityGrid
          key={weekStart}
          weekStart={weekStart}
          canEdit={!!myPair}
          mine={mine}
          others={others}
          submitted={!!myPair && submittedIds.has(myPair)}
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="mb-1 font-semibold">
              Sin indicar disponibilidad ({pending.length})
            </h2>
            {pending.length ? (
              <ul className="text-sm">
                {pending.map((p) => (
                  <li key={p.id}>
                    {p.name}
                    {p.id === myPair && " (vosotros)"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-70">Todas las parejas la han indicado.</p>
            )}
          </div>
          {cantPlay.length > 0 && (
            <div>
              <h2 className="mb-1 font-semibold">No pueden esta semana ({cantPlay.length})</h2>
              <ul className="text-sm">
                {cantPlay.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
