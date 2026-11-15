import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import SubmitButton from "@/components/SubmitButton";
import { displayName, requireLeagueAdmin, type Profile } from "@/lib/session";
import { button, card, input, rowLink } from "../../../parejas/ui";
import { manageCategory, renameCategory } from "../../actions";
import type { Category, Competition } from "../../ui";

type SeasonRow = { id: string; name: string; kind: string; started_at: string; ended_at: string | null };

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireLeagueAdmin();
  const { id } = await params;
  const { error, ok } = await searchParams;

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, competition_id")
    .eq("id", id)
    .maybeSingle<Category>();
  if (!category) notFound();

  const [{ data: competition }, { data: players }, { data: seasons }] = await Promise.all([
    supabase.from("competitions").select("id, name").eq("id", category.competition_id).maybeSingle<Competition>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, active, deleted_at, category_id")
      .eq("category_id", id)
      .is("deleted_at", null)
      .order("full_name")
      .returns<Profile[]>(),
    supabase
      .from("leagues")
      .select("id, name, kind, started_at, ended_at")
      .eq("category_id", id)
      .order("started_at", { ascending: false })
      .returns<SeasonRow[]>(),
  ]);

  const active = (players ?? []).filter((p) => p.active !== false);
  const inactive = (players ?? []).filter((p) => p.active === false);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/admin/ligas" className="text-sm underline opacity-70">
          ← {competition?.name ?? "Ligas y categorías"}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{category.name}</h1>
        <p className="mb-4 text-sm opacity-70">Categoría de {competition?.name}</p>
        <Notice ok={ok} error={error} />

        {profile.active_category?.id === category.id ? (
          <p className="mb-6 rounded-xl border border-lime-400 bg-lime-50 p-4 text-sm dark:bg-neutral-900">
            📍 <b>Estás gestionando esta categoría.</b> Partidos, disponibilidad, parejas y clasificación
            muestran los de {category.name}.
          </p>
        ) : (
          <form action={manageCategory} className={`${card} mb-6`}>
            <input type="hidden" name="id" value={category.id} />
            <p className="mb-3 text-sm opacity-70">
              Ahora gestionas {profile.active_category?.name ?? "otra categoría"}. Cambia a esta para ver y
              organizar sus partidos, disponibilidad, parejas y clasificación.
            </p>
            <SubmitButton pendingText="Cambiando…" className={button}>📍 Gestionar {category.name}</SubmitButton>
          </form>
        )}

        <section className={`${card} mb-6`}>
          <h2 className="mb-2 font-semibold">Nombre</h2>
          <form action={renameCategory} className="flex gap-2">
            <input type="hidden" name="id" value={category.id} />
            <input name="name" defaultValue={category.name} required maxLength={60} className={`${input} flex-1`} />
            <SubmitButton pendingText="Guardando…" className={button}>Renombrar</SubmitButton>
          </form>
        </section>

        <section className="mb-6">
          <h2 className="mb-1 text-lg font-semibold">Jugadores ({active.length})</h2>
          <p className="mb-3 text-sm opacity-70">
            ⭐ = organizador de la categoría. Entra en un jugador para nombrarlo o quitarlo como organizador.
          </p>
          {active.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {active.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/jugadores/${p.id}`} className={rowLink}>
                    <span className="truncate">
                      {displayName(p)} {p.is_organizer && "⭐"}
                    </span>
                    <span aria-hidden>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm opacity-70 dark:border-gray-700">
              Todavía no hay jugadores. Podrán entrar con las invitaciones de la categoría o pasar desde
              otra categoría en el descanso entre temporadas (lo preparamos en los próximos pasos).
            </p>
          )}
          {inactive.length > 0 && (
            <p className="mt-2 text-sm opacity-70">
              Desactivados: {inactive.map((p) => displayName(p)).join(", ")}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Temporadas</h2>
          <ul className="flex flex-col gap-2">
            {(seasons ?? []).map((s) => (
              <li
                key={s.id}
                className={`rounded-xl border p-3 text-sm ${
                  s.ended_at
                    ? "border-gray-200 dark:border-gray-800"
                    : "border-lime-400 bg-lime-50 font-semibold dark:bg-neutral-900"
                }`}
              >
                {s.name} · {s.kind === "individual" ? "individual" : "por parejas"} · {date(s.started_at)}
                {s.ended_at ? ` – ${date(s.ended_at)}` : " · en curso"}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
