import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

const description = "Buscamos nuevos jugadores. Crea tu usuario y apúntate a la liga.";

// La vista previa del enlace en WhatsApp muestra la imagen de la invitación.
export const metadata: Metadata = {
  title: "¡Únete al Torneo Pádel Loyola!",
  description,
  openGraph: {
    title: "¡Únete al Torneo Pádel Loyola!",
    description,
    images: [{ url: "/invitacion-og.jpg", width: 1200, height: 630 }],
  },
};

/** Enlace de invitación: abre directamente el formulario de crear cuenta. */
export default function UnetePage() {
  return (
    <Suspense>
      <LoginForm
        initialMode="registro"
        banner={
          <Image
            src="/invitacion.png"
            alt="¡Únete a la liga! Buscamos nuevos jugadores"
            width={1200}
            height={388}
            className="mb-4 h-auto w-full"
            priority
          />
        }
      />
    </Suspense>
  );
}
