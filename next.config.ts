import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El cartel de la encuesta lee estas fuentes e imagen desde el disco.
  outputFileTracingIncludes: {
    "/admin/bienvenida/cartel": ["./src/assets/fonts/*.woff", "./public/inicioencuesta.png"],
  },
};

export default nextConfig;
