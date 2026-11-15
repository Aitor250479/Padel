import ConfirmButton from "@/components/ConfirmButton";
import ShareImageButton from "@/components/ShareImageButton";
import { renewInvite } from "@/app/admin/invitaciones/actions";
import { inviteMessage } from "@/lib/invites";
import { siteUrl } from "@/lib/site-url";

/** Enlace de invitación (de una categoría o de una liga) para compartir por WhatsApp. */
export default async function InviteBox({
  title,
  help,
  code,
  competition,
  targetId,
  back,
}: {
  title: string;
  help: string;
  code: string;
  competition: string;
  /** Categoría o liga a la que pertenece el código. */
  targetId: string;
  back: string;
}) {
  const link = `${await siteUrl()}/unete/${code}`;
  return (
    <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="mb-3 text-sm opacity-70">
        {help} Enlace: <span className="break-all font-mono">{link}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ShareImageButton
          text={inviteMessage(link, competition)}
          imageUrl={`/unete/cartel?c=${code}`}
          fileName="invitacion.png"
          label="Invitar por WhatsApp"
        />
        <form action={renewInvite}>
          <input type="hidden" name="id" value={targetId} />
          <input type="hidden" name="back" value={back} />
          <ConfirmButton
            message="El enlace que ya has enviado dejará de servir. ¿Cambiarlo por uno nuevo?"
            pendingText="Cambiando…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            Cambiar enlace
          </ConfirmButton>
        </form>
      </div>
    </section>
  );
}
