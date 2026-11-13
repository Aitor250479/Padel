import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import LevelInfo from "@/components/LevelInfo";
import Notice from "@/components/Notice";
import SubmitButton from "@/components/SubmitButton";
import { LEVEL_QUESTIONS, formatLevel } from "@/lib/level";
import { loadLevels } from "@/lib/level-data";
import { displayName, requireProfile, type Profile } from "@/lib/session";
import { saveLevelForm, setInitialLevel } from "./actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const card = "rounded-xl border border-gray-200 p-4 dark:border-gray-800";

export default async function NivelPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; jugador?: string; repetir?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const other = params.jugador && params.jugador !== profile.id ? params.jugador : null;
  if (other && (!profile.is_organizer || !UUID.test(other))) notFound();

  const [{ data: player }, { levels, forms }] = await Promise.all([
    other
      ? supabase.from("profiles").select("id, email, full_name, is_organizer, pair_id").eq("id", other).maybeSingle<Profile>()
      : Promise.resolve({ data: profile }),
    loadLevels(supabase),
  ]);
  if (!player) notFound();

  const form = forms.get(player.id);
  const level = levels.get(player.id);
  const isMe = player.id === profile.id;
  // Cada jugador lo rellena una vez; un organizador puede repetirlo.
  const showForm = !form || (profile.is_organizer && !!params.repetir);
  const repeatHref = `/nivel?${other ? `jugador=${other}&` : ""}repetir=1`;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link
          href={isMe ? `/jugadores/${player.id}/estadisticas` : `/admin/jugadores/${player.id}`}
          className="text-sm underline opacity-70"
        >
          ← {isMe ? "Mis estadísticas" : displayName(player)}
        </Link>
        <h1 className="mt-3 mb-4">
          <Image
            src="/titulominivel.png"
            alt={isMe ? "Mi nivel" : `Nivel de ${displayName(player)}`}
            width={1200}
            height={288}
            className="h-auto w-full"
            sizes="(max-width: 640px) 100vw, 576px"
            priority
          />
        </h1>
        {!isMe && <p className="mb-4 text-center text-lg font-bold">{displayName(player)}</p>}
        <Notice ok={params.ok} error={params.error} />

        {form && (
          <section className="mb-6 rounded-xl bg-neutral-950 p-4 text-white">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Nivel actual</p>
                <p className="text-4xl font-black text-lime-400">{formatLevel(level?.level ?? Number(form.initial_level))}</p>
              </div>
              <div className="text-right text-sm">
                <p>
                  Nivel inicial: <b>{formatLevel(Number(form.initial_level))}</b>
                </p>
                <p className="opacity-70">
                  {level?.history.length ?? 0} {level?.history.length === 1 ? "partido oficial" : "partidos oficiales"}
                </p>
              </div>
            </div>
            <Link href={`/jugadores/${player.id}/estadisticas`} className="mt-3 inline-block text-sm text-lime-400 underline">
              Ver la evolución partido a partido ›
            </Link>
          </section>
        )}

        {showForm ? (
          <form action={saveLevelForm} className="mb-6 flex flex-col gap-4">
            <input type="hidden" name="target" value={player.id} />
            <h2>
              <Image
                src="/tituloformulario.png"
                alt="Formulario de nivel"
                width={1200}
                height={288}
                className="h-auto w-full"
                sizes="(max-width: 640px) 100vw, 576px"
              />
            </h2>
            <p className="text-sm opacity-80">
              {isMe
                ? "Contesta con sinceridad: de aquí sale tu nivel inicial y después lo irán ajustando tus partidos oficiales. Solo se rellena una vez."
                : `Rellena el formulario por ${displayName(player)}. Su nivel inicial se recalculará con estas respuestas.`}
            </p>
            {LEVEL_QUESTIONS.map((q, i) => (
              <fieldset key={q.key} className={card}>
                <legend className="px-1 font-semibold">
                  {i + 1}. {q.text}
                </legend>
                <div className="mt-1 flex flex-col gap-1">
                  {q.options.map((o, v) => (
                    <label key={o} className="flex items-start gap-2 rounded-lg p-1.5 text-sm has-[:checked]:bg-lime-100 dark:has-[:checked]:bg-lime-950">
                      <input
                        type="radio"
                        name={`q${i}`}
                        value={v}
                        required
                        defaultChecked={form?.answers?.[i] === v}
                        className="mt-0.5 accent-lime-500"
                      />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <SubmitButton className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white">
              {isMe ? "Calcular mi nivel" : "Guardar formulario"}
            </SubmitButton>
          </form>
        ) : (
          <p className="mb-6 text-sm opacity-70">
            {isMe
              ? "Ya has rellenado el formulario. Si crees que tu nivel inicial no es el bueno, habla con un organizador."
              : "Ya ha rellenado el formulario."}
            {profile.is_organizer && (
              <>
                {" "}
                <Link href={repeatHref} className="underline">
                  Repetir el formulario
                </Link>
              </>
            )}
          </p>
        )}

        {profile.is_organizer && (
          <section className={`${card} mb-6`}>
            <h2 className="mb-1 font-semibold">Organizador · Nivel inicial a mano</h2>
            <p className="mb-3 text-sm opacity-70">
              Sustituye al que salió del formulario. El nivel actual se recalcula con todos sus partidos.
            </p>
            <form action={setInitialLevel} className="flex flex-wrap gap-2">
              <input type="hidden" name="target" value={player.id} />
              <input
                name="level"
                required
                inputMode="decimal"
                pattern="(10([.,]0{1,2})?|[1-9]([.,][0-9]{1,2})?)"
                placeholder="Por ejemplo 3,50"
                defaultValue={form ? formatLevel(Number(form.initial_level)) : ""}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-black"
              />
              <SubmitButton className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                Guardar
              </SubmitButton>
            </form>
          </section>
        )}

        <LevelInfo />
      </main>
    </>
  );
}
