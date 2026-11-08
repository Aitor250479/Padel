import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los carteles (encuesta e invitación) leen estas fuentes e imagen desde el disco.
  outputFileTracingIncludes: {
    "/admin/bienvenida/cartel": ["./src/assets/fonts/*.woff", "./public/inicioencuesta.png"],
    "/admin/bienvenida/cartel-resultado": ["./src/assets/fonts/*.woff", "./public/finencuesta.png"],
    "/unete/cartel": ["./src/assets/fonts/*.woff", "./public/invitacion.png"],
  },
};

export default nextConfig;
