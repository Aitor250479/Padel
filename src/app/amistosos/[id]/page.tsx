import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import ResultFields from "@/components/ResultFields";
import SubmitButton from "@/components/SubmitButton";
import WhatsAppLink from "@/components/WhatsAppLink";
import {
  FRIENDLY_COLUMNS,
  FRIENDLY_PLAYER_COLUMNS,
  friendlyMessage,
  friendlyState,
  hasResult,
  lineup,
  missing,
  type FriendlyMatch,
  type FriendlyPlayer,
  type Side,
} from "@/lib/friendlies";
import { loadPeople } from "@/lib/friendlies-data";
import { formatBooking } from "@/lib/matches";
import { displayName, requireProfile } from "@/lib/session";
import { siteUrl } from "@/lib/site-url";
import { RESULT_OPTIONS } from "@/lib/standings";
import { nowInSpain } from "@/lib/weeks";
import { deleteFriendly, joinFriendly, leaveFriendly, saveFriendlyResult, updateFriendly } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const input = "rounded-lg border border-gray-300 px-2 py-1 text-black";
const card = "mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800";

export default async function FriendlyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { id } = await params;
  const notice = await searchParams;
  if (!UUID.test(id)) notFound();

  const [{ data: match }, { data: players }, { people, nameOf }] = await Promise.all([
    supabase.from("friendly_matches").select(FRIENDLY_COLUMNS).eq("id", id).maybeSingle<FriendlyMatch>(),
    supabase.from("friendly_players").select(FRIENDLY_PLAYER_COLUMNS).eq("match_id", id).returns<FriendlyPlayer[]>(),
    loadPeople(supabase),
  ]);
  if (!match) notFound();

  const all = players ?? [];
  const now = nowInSpain();
  const state = friendlyState(match, all, now);
  const isPast = state === "jugado" || state === "no_jugado";
  const l = lineup(match, all);
  const left = missing(match, all);
  const imIn = all.some((p) => p.profile_id === profile.id);
  const isCreator = match.created_by === profile.id;
  const org = profile.is_organizer;
  const canManage = org || (isCreator && !isPast);
  const when = formatBooking(match.play_at) ?? "";
  const team = (side: Side) => l[side].filter((x): x is string => !!x).map(nameOf).join(" y ") || "—";
  const free = people
    .filter((p) => !p.deleted_at && !all.some((x) => x.profile_id === p.id))
    .sort((x, y) => displayName(x).localeCompare(displayName(y)));
  const url = `${await siteUrl()}/amistosos/${match.id}`;

  const label = (a: number, b: number) =>
    a === b ? "1-1 · sin terminar, empate" : `${a}-${b} · gana ${a > b ? team("a") : team("b")}`;
  const options = RESULT_OPTIONS.map((o) => {
    const [score, ...rest] = label(o.a, o.b).split(" · ");
    return { ...o, score, text: rest.join(" · ") };
  });

  const slotBox = (side: Side, n: number) => {
    const who = l[side][n];
    const slot = n + 1;
    return (
      <li key={`${side}${slot}`} className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
        {who ? (
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/jugadores/${who}/estadisticas`}
              className="min-w-0 truncate font-semibold underline decoration-lime-400 decoration-2 underline-offset-2"
            >
              {nameOf(who)}
              {who === profile.id && " (tú)"}
            </Link>
            {org && who !== profile.id && (
              <form action={leaveFriendly}>
                <input type="hidden" name="id" value={match.id} />
                <input type="hidden" name="profile_id" value={who} />
                <ConfirmButton
                  message={`¿Quitar a ${nameOf(who)} de este amistoso?`}
                  pendingText="Quitando…"
                  className="text-xs text-red-600 underline"
                >
                  Quitar
                </ConfirmButton>
              </form>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-lime-700 dark:text-lime-300">¡Hueco libre!</span>
            {!isPast && (
              <form action={joinFriendly}>
                <input type="hidden" name="id" value={match.id} />
                <input type="hidden" name="side" value={side} />
                <input type="hidden" name="slot" value={slot} />
                <SubmitButton
                  pendingText="Apuntando…"
                  className={
                    imIn
                      ? "text-sm underline"
                      : "rounded-lg bg-lime-400 px-3 py-2 text-sm font-black text-neutral-950 active:scale-95"
                  }
                >
                  {imIn ? "Cambiarme aquí" : "¡Me apunto!"}
                </SubmitButton>
              </form>
            )}
            {org && free.length > 0 && (
              <form action={joinFriendly} className="flex flex-wrap items-center gap-1 text-xs">
                <input type="hidden" name="id" value={match.id} />
                <input type="hidden" name="side" value={side} />
                <input type="hidden" name="slot" value={slot} />
                <select name="profile_id" required defaultValue="" className={`${input} max-w-full text-xs`}>
                  <option value="" disabled>
                    Apuntar a…
                  </option>
                  {free.map((p) => (
                    <option key={p.id} value={p.id}>
                      {displayName(p)}
                    </option>
                  ))}
                </select>
                <SubmitButton pendingText="…" className="rounded bg-gray-800 px-2 py-1 font-semibold text-white">
                  Apuntar
                </SubmitButton>
              </form>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link href="/amistosos" className="text-sm underline">
          ← Partidos amistosos
        </Link>
        <h1 className="mt-3 text-2xl font-bold">🤝 Amistoso del {when}</h1>
        <p className="mb-4 text-sm opacity-70">
          {match.place ? `📍 ${match.place}` : "📍 Lugar sin indicar"}
          {match.created_by && ` · Lo propuso ${nameOf(match.created_by)}`}
        </p>

        <Notice ok={notice.ok} error={notice.error} />

        <p
          className={[
            "mb-4 rounded-lg p-3 text-sm font-semibold",
            state === "confirmado"
              ? "bg-emerald-600 text-white"
              : state === "abierto"
                ? "bg-lime-100 text-lime-900"
                : state === "jugado"
                  ? "bg-neutral-900 text-white"
                  : "bg-gray-200 text-gray-800",
          ].join(" ")}
        >
          {state === "abierto" &&
            `${left === 1 ? "Falta 1 jugador" : `Faltan ${left} jugadores`}. Cuando estéis los 4, el partido quedará confirmado.`}
          {state === "confirmado" && "✅ Confirmado: estáis los 4."}
          {state === "jugado" && (hasResult(match) ? "🏁 Partido jugado." : "🏁 Partido jugado. Falta poner el resultado.")}
          {state === "no_jugado" && "No se jugó: no llegaron a apuntarse los 4 jugadores."}
        </p>

        <section className={card}>
          <h2 className="mb-2 font-semibold">Jugadores</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["a", "b"] as const).map((side) => (
              <div key={side}>
                <p className="mb-1 text-xs font-semibold uppercase opacity-70">Pareja {side === "a" ? 1 : 2}</p>
                <ul className="flex flex-col gap-2">{[0, 1].map((n) => slotBox(side, n))}</ul>
              </div>
            ))}
          </div>
          {!isPast && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WhatsAppLink text={friendlyMessage(match, all, nameOf, formatBooking, url)}>
                {left ? "Avisar al grupo por WhatsApp" : "Mandar el partido por WhatsApp"}
              </WhatsAppLink>
              {imIn && (
                <form action={leaveFriendly}>
                  <input type="hidden" name="id" value={match.id} />
                  <ConfirmButton
                    message={
                      all.length === 1
                        ? "Eres el único apuntado: si te desapuntas, el amistoso se borrará. ¿Seguro?"
                        : state === "confirmado"
                          ? "El partido volverá a tener un hueco libre. ¿Seguro que te desapuntas?"
                          : "¿Seguro que te desapuntas?"
                    }
                    pendingText="Desapuntando…"
                    className="text-sm text-red-600 underline"
                  >
                    Desapuntarme
                  </ConfirmButton>
                </form>
              )}
            </div>
          )}
        </section>

        {state === "jugado" && (
          <section className={card}>
            <h2 className="font-semibold">Resultado</h2>
            {hasResult(match) ? (
              <p className="text-sm font-semibold">
                🏆 {team("a")} {match.sets_a}-{match.sets_b} {team("b")}
                {match.score_detail ? ` (${match.score_detail})` : ""}
                {match.sets_a === match.sets_b ? " · sin terminar, empate" : ""}
              </p>
            ) : (
              <p className="text-sm text-amber-700">Todavía no hay resultado.</p>
            )}
            {(imIn || org) && (
              <form action={saveFriendlyResult} className="mt-3 flex flex-col gap-2 text-sm">
                <input type="hidden" name="id" value={match.id} />
                <p className="font-medium">{hasResult(match) ? "Corregir el resultado" : "Poner el resultado"}</p>
                <p className="text-xs opacity-70">
                  Sets ganados por cada pareja. En los amistosos no hace falta que lo confirme nadie más. Si no
                  terminasteis, poned 1-1 o el ganador que acordéis.
                </p>
                <ResultFields
                  options={options}
                  pairA={team("a")}
                  pairB={team("b")}
                  defaultResult={hasResult(match) ? `${match.sets_a}-${match.sets_b}` : ""}
                  defaultDetail={match.score_detail}
                />
                <div className="flex gap-3">
                  <SubmitButton className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
                    Guardar resultado
                  </SubmitButton>
                  {hasResult(match) && (
                    <ConfirmButton
                      message="¿Seguro que quieres borrar el resultado?"
                      name="clear"
                      value="1"
                      formNoValidate
                      pendingText="Borrando…"
                      className="text-red-600 underline"
                    >
                      Borrar
                    </ConfirmButton>
                  )}
                </div>
              </form>
            )}
          </section>
        )}

        {canManage && (
          <section className={card}>
            <h2 className="mb-2 font-semibold">
              Cambiar fecha, hora o lugar{!isCreator && " (organizador)"}
            </h2>
            <form action={updateFriendly} className="flex flex-col gap-2 text-sm">
              <input type="hidden" name="id" value={match.id} />
              <input
                type="datetime-local"
                name="play_at"
                required
                defaultValue={match.play_at.slice(0, 16)}
                className={input}
              />
              <input
                name="place"
                maxLength={200}
                defaultValue={match.place ?? ""}
                placeholder="Club o lugar de la pista (opcional)"
                className={input}
              />
              <SubmitButton className="self-start rounded-lg bg-gray-800 px-3 py-1 font-semibold text-white">
                Guardar
              </SubmitButton>
            </form>
            <form action={deleteFriendly} className="mt-3">
              <input type="hidden" name="id" value={match.id} />
              <ConfirmButton
                message="¿Seguro que quieres borrar este amistoso? Se borrarán también los apuntados y el resultado."
                pendingText="Borrando…"
                className="text-sm text-red-600 underline"
              >
                Borrar amistoso
              </ConfirmButton>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
