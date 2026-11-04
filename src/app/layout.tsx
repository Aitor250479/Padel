import type { Metadata } from "next";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Torneo Pádel Loyola",
  description: "Disponibilidad, partidos y clasificación del torneo",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {/* Precarga la imagen de "Cargando datos" para que salga al instante */}
        <link rel="preload" href="/cargando.png" as="image" />
        {children}
        <Footer />
      </body>
    </html>
  );
}
