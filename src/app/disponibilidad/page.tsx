import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import Header from "@/components/Header";
import { displayName, requireProfile, type Pair, type Profile } from "@/lib/session";
import { addDays, currentWeek, formatWeekLong, parseWeek, weekLabel, weeksFromNow } from "@/lib/weeks";
import { setAvailability } from "./actions";

type Answer = { profile_id: string; can_play: boolean };

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  // No se puede ir a semanas pasadas: como mínimo, la semana en curso.
  const thisWeek = currentWeek();
  const requested = parseWeek((await searchParams).semana);
  const weekStart = requested < thisWeek ? thisWeek : requested;
  const offset = weeksFromNow(weekStart, thisWeek);

  const [{ data: pairs }, { data: players }, { data: answers }] = await Promise.all([
    supabase.from("pairs").select("id, name").order("name").returns<Pair[]>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, pair_id")
      .not("pair_id", "is", null)
      .order("created_at")
      .returns<Profile[]>(),
    supabase
      .from("player_availability")
      .select("profile_id, can_play")
      .eq("week_start", weekStart)
      .returns<Answer[]>(),
  ]);

  const answerOf = new Map((answers ?? []).map((a) => [a.profile_id, a.can_play]));
  const mine = answerOf.get(profile.id);

  const rows = (pairs ?? []).map((pair) => {
    const members = (players ?? []).filter((p) => p.pair_id === pair.id);
    const states = members.map((m) => answerOf.get(m.id));
    const status =
      members.length < 2
        ? "incomplete"
        : states.some((s) => s === false)
          ? "no"
          : states.every((s) => s === true)
            ? "yes"
            : "pending";
    return { pair, members, status };
  });
  const available = rows.filter((r) => r.status === "yes").length;

  const button = "flex-1 rounded-xl px-4 py-3 text-lg font-semibold";
  const arrow =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-lime-400 text-xl font-bold";

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Disponibilidad</h1>

        <section className="mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-4 flex items-center gap-2">
            {offset > 0 ? (
              <Link
                href={`/disponibilidad?semana=${addDays(weekStart, -7)}`}
                aria-label="Semana anterior"
                className={`${arrow} hover:bg-lime-100 dark:hover:bg-lime-950`}
              >
                ‹
              </Link>
            ) : (
              <span aria-hidden className={`${arrow} cursor-not-allowed opacity-25`}>
                ‹
              </span>
            )}
            <div className="flex-1 text-center">
              <span className="inline-block rounded-full bg-lime-400 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-neutral-950">
                {weekLabel(offset)}
              </span>
              <p className="mt-1 font-semibold leading-snug">
                ¿Puedes jugar la semana del {formatWeekLong(weekStart)}?
              </p>
            </div>
            <Link
              href={`/disponibilidad?semana=${addDays(weekStart, 7)}`}
              aria-label="Semana siguiente"
              className={`${arrow} hover:bg-lime-100 dark:hover:bg-lime-950`}
            >
              ›
            </Link>
          </div>
          <form action={setAvailability} className="flex gap-3">
            <input type="hidden" name="week_start" value={weekStart} />
            <SubmitButton
              name="can_play"
              value="yes"
              className={`${button} ${mine === true ? "bg-emerald-600 text-white" : "border border-emerald-600 text-emerald-700 dark:text-emerald-400"}`}
            >
              ✅ Sí puedo
            </SubmitButton>
            <SubmitButton
              name="can_play"
              value="no"
              className={`${button} ${mine === false ? "bg-red-600 text-white" : "border border-red-600 text-red-700 dark:text-red-400"}`}
            >
              ❌ No puedo
            </SubmitButton>
          </form>
          <p className="mt-2 text-sm opacity-70">
            {mine === undefined
              ? "Todavía no lo has indicado."
              : mine
                ? "Has indicado que puedes jugar."
                : "Has indicado que no puedes jugar."}{" "}
            Tu pareja jugará si los dos podéis.
          </p>
          {!profile.pair_id && (
            <p className="mt-2 text-sm text-amber-700">
              Aún no tienes pareja asignada. Un organizador te la asignará.
            </p>
          )}
        </section>

        <h2 className="mb-2 font-semibold">
          Parejas ({available} de {rows.length} pueden jugar)
        </h2>
        <ul className="flex flex-col gap-2">
          {rows.map(({ pair, members, status }) => (
            <li
              key={pair.id}
              className={[
                "rounded-xl border p-3",
                status === "yes"
                  ? "border-emerald-400 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                  : "border-gray-200 dark:border-gray-800",
                pair.id === profile.pair_id ? "ring-2 ring-sky-400" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{pair.name}</span>
                <span className="text-sm">
                  {status === "yes" && "✅ Pueden jugar"}
                  {status === "no" && "❌ No pueden"}
                  {status === "pending" && "⏳ Falta que respondan"}
                  {status === "incomplete" && "Pareja incompleta"}
                </span>
              </div>
              <p className="mt-1 text-sm opacity-80">
                {members.map((m, i) => {
                  const a = answerOf.get(m.id);
                  return (
                    <span key={m.id}>
                      {i > 0 && " · "}
                      {displayName(m)} {a === true ? "✅" : a === false ? "❌" : "⏳"}
                    </span>
                  );
                })}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs opacity-60">✅ puede · ❌ no puede · ⏳ sin responder</p>
      </main>
    </>
  );
}
