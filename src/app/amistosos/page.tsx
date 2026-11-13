import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import SubmitButton from "@/components/SubmitButton";
import { friendlyState, hasResult, lineup, missing, type FriendlyMatch, type FriendlyState } from "@/lib/friendlies";
import { loadFriendlies, loadPeople } from "@/lib/friendlies-data";
import { formatBooking } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { nowInSpain } from "@/lib/weeks";
import { createFriendly } from "./actions";

const input = "rounded-lg border border-gray-300 px-2 py-1 text-black";

const BADGE: Record<FriendlyState, { text: string; className: string }> = {
  abierto: { text: "Con huecos", className: "bg-lime-100 text-lime-900" },
  confirmado: { text: "Confirmado", className: "bg-emerald-600 text-white" },
  jugado: { text: "Jugado", className: "bg-neutral-800 text-white" },
  no_jugado: { text: "No jugado", className: "bg-gray-200 text-gray-700" },
};

export default async function FriendliesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const notice = await searchParams;
  const now = nowInSpain();
  const [{ matches, players }, { nameOf }] = await Promise.all([loadFriendlies(supabase), loadPeople(supabase)]);

  const state = (m: FriendlyMatch) => friendlyState(m, players, now);
  const asc = [...matches].sort((x, y) => x.play_at.localeCompare(y.play_at));
  const upcoming = asc.filter((m) => state(m) === "abierto" || state(m) === "confirmado");
  const played = matches.filter((m) => state(m) === "jugado");
  const notPlayed = matches.filter((m) => state(m) === "no_jugado");

  const row = (m: FriendlyMatch) => {
    const s = state(m);
    const l = lineup(m, players);
    const team = (ids: (string | null)[]) => ids.map((id) => (id ? nameOf(id) : "¿?")).join(" y ");
    const left = missing(m, players);
    const mine = l.a.includes(profile.id) || l.b.includes(profile.id);
    return (
      <li key={m.id}>
        <Link
          href={`/amistosos/${m.id}`}
          className={`flex items-center gap-3 rounded-xl border-2 p-3 active:scale-[0.99] ${
            mine ? "border-lime-400" : "border-gray-200 dark:border-gray-800"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{formatBooking(m.play_at)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[s].className}`}>
                {s === "abierto" ? (left === 1 ? "Falta 1" : `Faltan ${left}`) : BADGE[s].text}
              </span>
              {mine && <span className="text-xs font-semibold text-lime-700 dark:text-lime-300">Estás apuntado</span>}
            </span>
            <span className="block text-sm opacity-80">
              {team(l.a)} <span className="opacity-60">vs</span> {team(l.b)}
            </span>
            <span className="block text-xs opacity-60">
              {m.place ? `📍 ${m.place}` : "📍 Lugar sin indicar"}
              {s === "jugado" && (hasResult(m) ? ` · Resultado ${m.sets_a}-${m.sets_b}` : " · Sin resultado todavía")}
            </span>
          </span>
          <span aria-hidden className="text-xl opacity-50">
            ›
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <h1 className="text-2xl font-bold">🤝 Partidos amistosos</h1>
        <p className="mb-4 text-sm opacity-70">
          Partidos fuera de la liga: no cuentan para la clasificación, pero sí para tus estadísticas. Crea uno
          y que se apunte quien quiera.
        </p>
        <Notice ok={notice.ok} error={notice.error} />

        <details className="mb-6 rounded-xl border-2 border-lime-400 p-4" open={matches.length === 0}>
          <summary className="cursor-pointer text-lg font-semibold">➕ Crear un amistoso</summary>
          <form action={createFriendly} className="mt-3 flex flex-col gap-2 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium">Fecha y hora</span>
              <input type="datetime-local" name="play_at" required min={now} className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Lugar (opcional)</span>
              <input name="place" maxLength={200} placeholder="Club o lugar de la pista" className={input} />
            </label>
            <p className="text-xs opacity-70">Quedarás apuntado en el primer hueco. Luego puedes avisar al grupo por WhatsApp.</p>
            <SubmitButton className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
              Crear amistoso
            </SubmitButton>
          </form>
        </details>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Próximos</h2>
          {upcoming.length ? (
            <ul className="flex flex-col gap-2">{upcoming.map(row)}</ul>
          ) : (
            <p className="text-sm opacity-70">No hay amistosos propuestos. ¡Anímate y crea uno!</p>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Jugados</h2>
          {played.length ? (
            <ul className="flex flex-col gap-2">{played.map(row)}</ul>
          ) : (
            <p className="text-sm opacity-70">Todavía no se ha jugado ningún amistoso.</p>
          )}
        </section>

        {notPlayed.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">
              No jugados por falta de jugadores ({notPlayed.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-2">{notPlayed.map(row)}</ul>
          </details>
        )}
      </main>
    </>
  );
}
