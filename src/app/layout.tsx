import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Torneo de pádel",
  description: "Disponibilidad, partidos y clasificación del torneo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
