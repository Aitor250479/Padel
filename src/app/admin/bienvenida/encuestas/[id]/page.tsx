import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import SharePollButton from "@/components/SharePollButton";
import SharePollResultButton from "@/components/SharePollResultButton";
import { requireOrganizer } from "@/lib/session";
import { siteUrl } from "@/lib/site-url";
import { formatBooking } from "@/lib/matches";
import { loadPoll, pollOnHome, pollOpen, pollResultText, pollResultUntil, pollResults } from "@/lib/polls";
import { nowInSpain } from "@/lib/weeks";
import { updatePollClose } from "../actions";

const field = "rounded-lg border border-gray-300 px-3 py-2 text-black";

export default async function EncuestaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams]);
  const data = await loadPoll(supabase, id);
  if (!data) notFound();
  const { poll, options, votes } = data;
  const now = nowInSpain();
  const onHome = pollOnHome(poll, now);
  const until = formatBooking(pollResultUntil(poll));
  const open = pollOpen(poll, now);
  const results = open ? null : pollResults(options, votes);
  // Participación: cuántos jugadores activos han votado (sin saber quién ni qué).
  const participation = open
    ? ((await supabase.rpc("poll_participation", { p: poll.id })).data as { voted: number; eligible: number }[] | null)?.[0] ?? null
    : null;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/bienvenida/encuestas" className="text-sm opacity-70 hover:underline">
          ← Encuestas
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">{poll.question}</h1>
        <p className="mb-4 text-sm opacity-70">
          {open
            ? `Abierta hasta el ${formatBooking(poll.closes_at)}. Los votos se verán al cerrarse.`
            : `Cerrada el ${formatBooking(poll.closes_at)} · ${results!.total} ${results!.total === 1 ? "voto" : "votos"}`}
          {open
            ? ` Después, el resultado sale en el inicio hasta el ${until}.`
            : onHome
              ? ` · El resultado sale en el inicio hasta el ${until}.`
              : " · Ya no sale en el inicio."}
        </p>
        <Notice ok={ok} error={error} />

        {results ? (
          <section className="flex flex-col gap-4">
            {results.total === 0 ? (
              <p className="text-sm opacity-70">Nadie votó en esta encuesta.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {results.rows.map((r) => (
                  <li key={r.id}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className={r.winner ? "font-semibold" : ""}>
                        {r.winner && "🏆 "}
                        {r.label}
                      </span>
                      <span>
                        <b>{r.count}</b> ({r.percent}%)
                      </span>
                    </div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-800">
                      <div
                        className={`h-full rounded-full ${r.winner ? "bg-lime-400" : "bg-gray-400"}`}
                        style={{ width: `${r.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {results.total > 0 && <SharePollResultButton pollId={poll.id} text={pollResultText(poll.question, results)} />}
            <p className="text-xs opacity-60">Esta encuesta está cerrada: solo se puede consultar su resultado.</p>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            {participation && (
              <div>
                <p className="text-sm font-semibold">
                  🗳️ {participation.voted}/{participation.eligible} jugadores han votado
                </p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-lime-400"
                    style={{
                      width: `${participation.eligible ? Math.round((participation.voted / participation.eligible) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <ul className="list-inside list-disc text-sm">
              {options.map((o) => (
                <li key={o.id}>{o.label}</li>
              ))}
            </ul>
            <SharePollButton
              pollId={poll.id}
              text={`🗳️ *¡Nueva encuesta en el Torneo Pádel Loyola!*\n*${poll.question}*\n⏳ Vota antes del ${formatBooking(poll.closes_at)} 👉 ${await siteUrl()}/encuesta/${poll.id}`}
            />
            <form action={updatePollClose} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={poll.id} />
              <span className="font-semibold">Cambiar el cierre:</span>
              <input type="date" name="closes_day" defaultValue={poll.closes_at.slice(0, 10)} className={field} />
              <input type="time" name="closes_time" defaultValue={poll.closes_at.slice(11, 16)} className={field} />
              <SubmitButton className="rounded-lg bg-gray-800 px-3 py-2 font-semibold text-white">Guardar</SubmitButton>
              <SubmitButton
                name="close_now"
                value="1"
                className="rounded-lg border border-red-600 px-3 py-2 font-semibold text-red-700 dark:text-red-400"
              >
                Cerrar ya
              </SubmitButton>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
