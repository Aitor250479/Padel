import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { inviteTitle, loadInvite } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

const description = "Buscamos nuevos jugadores. Crea tu usuario y apúntate a la liga.";

async function invite(params: Promise<{ codigo: string }>) {
  const { codigo } = await params;
  return loadInvite(await createClient(), codigo);
}

// La vista previa del enlace en WhatsApp muestra la imagen de la invitación.
export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }): Promise<Metadata> {
  const info = await invite(params);
  const title = `¡Únete a ${info ? inviteTitle(info) : "la liga"}!`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: "/invitacion-og.jpg", width: 1200, height: 630 }] },
  };
}

/** Invitación de una categoría o de una liga: abre el formulario de crear cuenta. */
export default async function InvitePage({ params }: { params: Promise<{ codigo: string }> }) {
  const info = await invite(params);
  // Enlace que ya no vale (se ha cambiado el código): la invitación general.
  if (!info) redirect("/unete");
  return (
    <Suspense>
      <LoginForm
        initialMode="registro"
        invite={info.code}
        title={info.competition_name}
        banner={
          <>
            <Image
              src="/invitacion.png"
              alt="¡Únete a la liga! Buscamos nuevos jugadores"
              width={1200}
              height={388}
              className="mb-3 h-auto w-full"
              priority
            />
            <p className="mb-2 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {info.category_name
                ? `Invitación a la categoría ${info.category_name}`
                : "Invitación a la liga: un organizador te asignará tu categoría"}
            </p>
          </>
        }
      />
    </Suspense>
  );
}
