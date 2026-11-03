import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Torneo Pádel Loyola y CIA",
  description: "Disponibilidad, partidos y clasificación del torneo",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
