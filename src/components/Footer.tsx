export default function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-3xl border-t border-gray-200 px-4 py-6 text-xs opacity-70 dark:border-gray-800">
      <details>
        <summary className="cursor-pointer select-none">
          © Torneo Pádel Loyola · Términos y condiciones de uso
        </summary>
        <p className="mt-2 leading-relaxed">
          Esta web la ha programado Aitor en sus ratos libres, sin ánimo de lucro y para uso
          exclusivo del grupo de padres que jugamos estos partidos entre amigos. Al usarla aceptas
          que: (1) los resultados se introducen con honestidad, aunque duela; (2) la organización
          no se hace responsable de lesiones de rodilla, egos heridos ni discusiones sobre si la
          bola tocó la línea; (3) cualquier reclamación se resolverá en el bar, después del
          partido.
        </p>
      </details>
    </footer>
  );
}
