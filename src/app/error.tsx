"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";

/** Si algo falla al cargar una pantalla, en vez de quedarse en blanco se ve esto. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Image src="/perdedor.png" alt="" width={140} height={140} className="h-36 w-36 object-contain" />
      <h1 className="text-xl font-black">¡Bola a la red! Algo ha fallado</h1>
      <p className="text-sm opacity-70">
        Puede que lo que estabas guardando no se haya guardado. Recarga la página y compruébalo.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white"
        >
          Recargar
        </button>
        <Link href="/" className="rounded-lg border border-gray-300 px-4 py-2 font-semibold">
          Ir al inicio
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs opacity-50">Si se repite, pásale este código a Aitor: {error.digest}</p>
      )}
    </main>
  );
}
