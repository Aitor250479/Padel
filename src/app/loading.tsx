import Image from "next/image";

export default function Loading() {
  return (
    <main
      className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <Image
        src="/cargando.png"
        alt="Cargando datos"
        width={256}
        height={256}
        className="loading-logo h-64 w-64 object-contain drop-shadow-lg"
        priority
        unoptimized
      />
    </main>
  );
}
