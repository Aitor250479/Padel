import Image from "next/image";

export default function Loading() {
  return (
    <>
      <header className="bg-neutral-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Image src="/logo.png" alt="" width={56} height={56} className="h-14 w-14 object-contain" priority />
          <span className="text-lg font-extrabold tracking-tight">Torneo Pádel Loyola</span>
        </div>
        <div className="h-1 overflow-hidden bg-red-600">
          <div className="loading-bar h-full w-1/3 bg-lime-400" />
        </div>
      </header>
      <main
        className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="loading-ball h-8 w-8 rounded-full bg-lime-400 shadow-md" />
        <p className="text-sm font-semibold opacity-70">Cargando…</p>
      </main>
    </>
  );
}
