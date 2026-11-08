import Image from "next/image";
import SubmitButton from "@/components/SubmitButton";
import { vote } from "@/app/encuesta/actions";
import { formatBooking } from "@/lib/matches";
import { pollOpen, pollResults, type Poll, type PollOption, type PollVote } from "@/lib/polls";

/** Encuesta del inicio: para votar mientras está abierta y con el resultado al cerrarse. */
export default function PollCard({
  poll,
  options,
  votes,
  me,
  now,
}: {
  poll: Poll;
  options: PollOption[];
  votes: PollVote[];
  me: string;
  now: string;
}) {
  const open = pollOpen(poll, now);
  const mine = votes.find((v) => v.profile_id === me)?.option_id;
  const myLabel = options.find((o) => o.id === mine)?.label;
  const closes = formatBooking(poll.closes_at);

  if (open) {
    return (
      <section id="encuesta" className="flex flex-col gap-4">
        <Image
          src="/inicioencuesta.png"
          alt="¡Vota en la encuesta! Tu opinión cuenta"
          width={1200}
          height={614}
          className="h-auto w-full"
          priority
        />
        <div className="rounded-2xl border-l-4 border-lime-400 bg-neutral-50 p-5 shadow-sm dark:bg-neutral-900">
          <h1 className="whitespace-pre-line text-xl font-bold">{poll.question}</h1>
          <p className="mt-1 text-sm opacity-70">Abierta hasta el {closes}.</p>
          <p
            className={[
              "mt-3 rounded-lg p-2 text-sm font-semibold",
              mine ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900",
            ].join(" ")}
          >
            {mine ? `✅ Ya has votado: «${myLabel}». Puedes cambiarlo hasta el cierre.` : "⏳ Todavía no has votado."}
          </p>
          <form action={vote} className="mt-4 flex flex-col gap-2">
            <input type="hidden" name="poll_id" value={poll.id} />
            {options.map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 has-[:checked]:border-lime-400 has-[:checked]:bg-lime-50 dark:border-gray-800 dark:bg-neutral-950 dark:has-[:checked]:bg-neutral-800"
              >
                <input type="radio" name="option_id" value={o.id} defaultChecked={o.id === mine} required />
                <span>{o.label}</span>
              </label>
            ))}
            <SubmitButton className="mt-1 self-start rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
              {mine ? "Cambiar mi voto" : "Votar"}
            </SubmitButton>
          </form>
          <p className="mt-3 text-xs opacity-60">
            Los votos de los demás no se ven hasta que se cierre la encuesta.
          </p>
        </div>
      </section>
    );
  }

  const { total, rows } = pollResults(options, votes);
  return (
    <section id="encuesta" className="flex flex-col gap-4">
      <Image
        src="/finencuesta.png"
        alt="¡Encuesta cerrada! Ya puedes ver los resultados"
        width={1200}
        height={614}
        className="h-auto w-full"
        priority
      />
      <div className="rounded-2xl border-l-4 border-lime-400 bg-neutral-50 p-5 shadow-sm dark:bg-neutral-900">
        <h1 className="whitespace-pre-line text-xl font-bold">{poll.question}</h1>
        <p className="mt-1 text-sm opacity-70">
          Cerrada el {closes} · {total} {total === 1 ? "voto" : "votos"}
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className={r.winner ? "font-bold" : ""}>
                  {r.winner && "🏆 "}
                  {r.label}
                  {r.id === mine && <span className="ml-2 text-xs text-emerald-600">tu voto</span>}
                </span>
                <span className="shrink-0 tabular-nums opacity-80">
                  {r.count} · {r.percent}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-800">
                <div
                  className={r.winner ? "h-full rounded-full bg-lime-400" : "h-full rounded-full bg-gray-400"}
                  style={{ width: `${r.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        {total === 0 && <p className="mt-3 text-sm opacity-70">Nadie votó en esta encuesta.</p>}
      </div>
    </section>
  );
}
