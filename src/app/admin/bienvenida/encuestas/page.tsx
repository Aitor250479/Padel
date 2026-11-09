import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import PollOptionsFields from "@/components/PollOptionsFields";
import { requireOrganizer } from "@/lib/session";
import { formatBooking } from "@/lib/matches";
import { POLL_COLUMNS, RESULT_HOURS, pollOnHome, pollOpen, pollResults, type Poll, type PollOption, type PollVote } from "@/lib/polls";
import { addDays, nowInSpain } from "@/lib/weeks";
import { createPoll } from "./actions";

const field = "rounded-lg border border-gray-300 px-3 py-2 text-black";

export default async function EncuestasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { error, ok } = await searchParams;
  const [{ data: polls }, { data: options }, { data: votes }] = await Promise.all([
    supabase.from("polls").select(POLL_COLUMNS).order("created_at", { ascending: false }).returns<Poll[]>(),
    supabase.from("poll_options").select("id, poll_id, position, label").returns<PollOption[]>(),
    // Solo llegan los votos de las encuestas cerradas (y el mío de las abiertas).
    supabase.from("poll_votes").select("poll_id, profile_id, option_id").returns<(PollVote & { poll_id: string })[]>(),
  ]);
  const now = nowInSpain();
  const tomorrow = addDays(now.slice(0, 10), 1);

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/bienvenida" className="text-sm opacity-70 hover:underline">
          ← Pantalla de inicio
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">🗳️ Encuestas</h1>
        <p className="mb-4 text-sm opacity-70">Crea una encuesta nueva o consulta las que ya se han publicado.</p>
        <Notice ok={ok} error={error} />

        <form action={createPoll} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="font-semibold">Encuesta nueva</h2>
          <p className="text-sm opacity-70">
            Al crearla sale en el inicio de todos los jugadores como tarjeta. Cada jugador vota una vez y
            puede cambiar su voto hasta el cierre; nadie ve los votos de los demás hasta entonces. Tras
            el cierre, la tarjeta enseña el resultado durante el tiempo que elijas.
          </p>
          <textarea name="question" rows={2} maxLength={300} required placeholder="Pregunta" className={field} />
          <PollOptionsFields className={field} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">Abierta hasta el</span>
            <input type="date" name="closes_day" defaultValue={tomorrow} required className={field} />
            <span>a las</span>
            <input type="time" name="closes_time" defaultValue="22:00" required className={field} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">Mostrar el resultado</span>
            <select name="result_hours" defaultValue={48} className={field}>
              {RESULT_HOURS.map((r) => (
                <option key={r.hours} value={r.hours}>
                  {r.label}
                </option>
              ))}
            </select>
            <span>tras el cierre</span>
          </div>
          <SubmitButton className="self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
            Crear y publicar
          </SubmitButton>
        </form>

        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Encuestas publicadas</h2>
          {!polls?.length && <p className="text-sm opacity-70">Todavía no hay ninguna encuesta.</p>}
          <ul className="flex flex-col gap-2">
            {(polls ?? []).map((p) => {
              const open = pollOpen(p, now);
              const isOnHome = pollOnHome(p, now);
              const results = open
                ? null
                : pollResults(
                    (options ?? []).filter((o) => o.poll_id === p.id),
                    (votes ?? []).filter((v) => v.poll_id === p.id),
                  );
              const winners = results?.rows.filter((r) => r.winner) ?? [];
              return (
                <li key={p.id}>
                  <Link
                    href={`/admin/bienvenida/encuestas/${p.id}`}
                    className="block rounded-xl border border-gray-200 p-3 hover:border-lime-400 dark:border-gray-800"
                  >
                    <span className="mb-1 flex flex-wrap gap-1 text-xs font-semibold">
                      {open ? (
                        <span className="rounded-full bg-lime-100 px-2 py-0.5 text-lime-900">Abierta</span>
                      ) : (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-800">Cerrada</span>
                      )}
                      {isOnHome && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">En el inicio</span>}
                    </span>
                    <span className="block font-medium">{p.question}</span>
                    <span className="block text-sm opacity-70">
                      {open ? `Abierta hasta el ${formatBooking(p.closes_at)}` : `Cerrada el ${formatBooking(p.closes_at)}`}
                      {results &&
                        ` · ${results.total} ${results.total === 1 ? "voto" : "votos"}` +
                          (winners.length === 1
                            ? ` · 🏆 ${winners[0].label}`
                            : winners.length > 1
                              ? ` · 🤝 Empate`
                              : "")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}
