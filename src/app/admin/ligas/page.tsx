import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import SubmitButton from "@/components/SubmitButton";
import { displayName, requireLeagueAdmin, type Profile } from "@/lib/session";
import { button, card, input, rowLink } from "../parejas/ui";
import { addLeagueAdmin, createCategory, createCompetition, removeLeagueAdmin, renameCompetition } from "./actions";
import { KindSelect, type Category, type Competition, type Season } from "./ui";

export default async function LigasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireLeagueAdmin();
  const { error, ok } = await searchParams;
  const superadmin = !!profile.is_superadmin;

  const [{ data: competitions }, { data: categories }, { data: admins }, { data: players }, { data: seasons }] =
    await Promise.all([
      supabase.from("competitions").select("id, name").order("created_at").returns<Competition[]>(),
      supabase.from("categories").select("id, name, competition_id").order("created_at").returns<Category[]>(),
      supabase
        .from("competition_admins")
        .select("competition_id, profile_id")
        .returns<{ competition_id: string; profile_id: string }[]>(),
      supabase
        .from("profiles")
        .select("id, email, full_name, is_organizer, active, deleted_at, category_id")
        .is("deleted_at", null)
        .order("full_name")
        .returns<Profile[]>(),
      supabase.from("leagues").select("id, name, kind, category_id").is("ended_at", null).returns<Season[]>(),
    ]);

  const byId = new Map((players ?? []).map((p) => [p.id, p]));
  const activePlayers = (players ?? []).filter((p) => p.active !== false);
  const pending = activePlayers.filter((p) => !p.category_id);

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold">Ligas y categorías</h1>
        <p className="mb-4 text-sm opacity-70">
          {superadmin
            ? "Como superadmin ves todas las ligas. Los jugadores solo ven la suya y entran directamente en su categoría."
            : "Gestionas las categorías de tu liga. Los jugadores solo ven la suya y entran directamente en su categoría."}{" "}
          📍 marca la categoría que estás gestionando: entra en otra para cambiar.
        </p>
        <Notice ok={ok} error={error} />

        {pending.length > 0 && (
          <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            ⏳ <b>{pending.length} pendiente{pending.length === 1 ? "" : "s"} de categoría:</b>{" "}
            {pending.map((p) => displayName(p)).join(", ")}
          </p>
        )}

        <div className="flex flex-col gap-6">
          {(competitions ?? []).map((comp) => {
            const cats = (categories ?? []).filter((c) => c.competition_id === comp.id);
            const compAdmins = (admins ?? [])
              .filter((a) => a.competition_id === comp.id)
              .map((a) => byId.get(a.profile_id))
              .filter((p): p is Profile => !!p);
            const candidates = activePlayers.filter((p) => !compAdmins.some((a) => a.id === p.id));
            return (
              <section key={comp.id} className={`${card} border-sky-300 dark:border-sky-800`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Liga</p>
                {superadmin ? (
                  <form action={renameCompetition} className="mb-3 flex gap-2">
                    <input type="hidden" name="id" value={comp.id} />
                    <input name="name" defaultValue={comp.name} required maxLength={60} className={`${input} flex-1 font-bold`} />
                    <SubmitButton pendingText="Guardando…" className={button}>Renombrar</SubmitButton>
                  </form>
                ) : (
                  <h2 className="mb-3 text-xl font-bold">{comp.name}</h2>
                )}

                <h3 className="mb-2 font-semibold">Categorías ({cats.length})</h3>
                <ul className="mb-3 grid gap-2 sm:grid-cols-2">
                  {cats.map((cat) => {
                    const members = activePlayers.filter((p) => p.category_id === cat.id);
                    const orgs = members.filter((p) => p.is_organizer);
                    const season = (seasons ?? []).find((s) => s.category_id === cat.id);
                    return (
                      <li key={cat.id}>
                        <Link href={`/admin/ligas/categoria/${cat.id}`} className={rowLink}>
                          <span className="min-w-0">
                            <span className="block font-semibold">
                              {cat.name} {profile.active_category?.id === cat.id && "📍"}
                            </span>
                            <span className="block truncate text-sm opacity-70">
                              {members.length} jugador{members.length === 1 ? "" : "es"}
                              {season ? ` · ${season.name} (${season.kind})` : " · sin temporada en curso"}
                            </span>
                            <span className="block truncate text-xs opacity-60">
                              {orgs.length ? `⭐ ${orgs.map((o) => displayName(o)).join(", ")}` : "Sin organizador"}
                            </span>
                          </span>
                          <span aria-hidden>›</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <details className="mb-4 text-sm">
                  <summary className="cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400">
                    ➕ Nueva categoría
                  </summary>
                  <form action={createCategory} className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="competition_id" value={comp.id} />
                    <input name="name" required maxLength={60} placeholder="Nombre de la categoría" className={input} />
                    <input name="season" maxLength={60} placeholder="Primera temporada (Temporada 1)" className={input} />
                    <KindSelect />
                    <SubmitButton pendingText="Creando…" className={button}>Crear categoría</SubmitButton>
                  </form>
                </details>

                <h3 className="mb-1 font-semibold">Organizadores de liga</h3>
                <p className="mb-2 text-sm opacity-70">
                  Gestionan todas las categorías de la liga, nombran organizadores de categoría y cambian
                  jugadores de categoría.
                </p>
                {compAdmins.length ? (
                  <ul className="mb-2 flex flex-col gap-1 text-sm">
                    {compAdmins.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <span className="flex-1">🏟️ {displayName(a)}</span>
                        {superadmin && (
                          <form action={removeLeagueAdmin}>
                            <input type="hidden" name="competition_id" value={comp.id} />
                            <input type="hidden" name="profile_id" value={a.id} />
                            <ConfirmButton
                              message={`¿Quitar a ${displayName(a)} como organizador de ${comp.name}?`}
                              pendingText="Quitando…"
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                            >
                              Quitar
                            </ConfirmButton>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-2 text-sm opacity-70">
                    Ninguno todavía{superadmin ? " (tú, como superadmin, ya puedes hacerlo todo)" : ""}.
                  </p>
                )}
                {superadmin && candidates.length > 0 && (
                  <form action={addLeagueAdmin} className="flex gap-2">
                    <input type="hidden" name="competition_id" value={comp.id} />
                    <select name="profile_id" required defaultValue="" className={`${input} min-w-0 flex-1`}>
                      <option value="" disabled>
                        Elige un jugador…
                      </option>
                      {candidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {displayName(p)}
                        </option>
                      ))}
                    </select>
                    <SubmitButton pendingText="Añadiendo…" className={button}>Añadir</SubmitButton>
                  </form>
                )}
              </section>
            );
          })}
        </div>

        {superadmin && (
          <section className={`${card} mt-8`}>
            <h2 className="mb-1 font-semibold">➕ Nueva liga</h2>
            <p className="mb-3 text-sm opacity-70">Se crea con su primera categoría y su primera temporada.</p>
            <form action={createCompetition} className="grid gap-2 sm:grid-cols-2">
              <input name="name" required maxLength={60} placeholder="Nombre de la liga" className={input} />
              <input name="category" required maxLength={60} placeholder="Primera categoría" className={input} />
              <input name="season" maxLength={60} placeholder="Primera temporada (Temporada 1)" className={input} />
              <KindSelect />
              <SubmitButton pendingText="Creando…" className={button}>Crear liga</SubmitButton>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
