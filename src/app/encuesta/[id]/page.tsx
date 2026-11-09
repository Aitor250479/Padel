import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import PollCard from "@/components/PollCard";
import { requireProfile } from "@/lib/session";
import { loadPoll } from "@/lib/polls";
import { nowInSpain } from "@/lib/weeks";

/** Una encuesta: para votar mientras está abierta y, al cerrarse, su resultado. */
export default async function EncuestaJugadorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const data = await loadPoll(supabase, id);
  if (!data) notFound();
  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/" className="mb-3 inline-block text-sm opacity-70 hover:underline">
          ← Inicio
        </Link>
        <Notice ok={notice.ok} error={notice.error} />
        <PollCard
          poll={data.poll}
          options={data.options}
          votes={data.votes}
          me={profile.id}
          now={nowInSpain()}
          canVote={profile.active !== false}
        />
      </main>
    </>
  );
}
