import Image from "next/image";

export default function Loading() {
  return (
    <main
      className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <Image
        src="/logo.png"
        alt="Cargando"
        width={180}
        height={180}
        className="loading-logo h-44 w-44 object-contain drop-shadow-lg"
        priority
      />
      <p className="text-sm font-semibold opacity-70">Cargando…</p>
    </main>
  );
}
