import { MAX_INITIAL, formatLevel } from "@/lib/level";

/** Explicación de cómo se calcula el nivel. */
export default function LevelInfo() {
  return (
    <div className="text-xs opacity-70">
      <p className="font-semibold">🎯 Cómo se calcula el nivel</p>
      <p>
        El nivel va de 1,00 (empiezas a jugar) a 10 (campeón del mundo). El nivel inicial sale del formulario y
        después lo mueven solo los partidos oficiales con resultado confirmado. Los amistosos no cuentan.
      </p>
      <ul className="my-1 list-inside list-disc">
        <li>El nivel de una pareja es la media de sus dos jugadores.</li>
        <li>
          Antes de cada partido se calcula el resultado esperado según la diferencia de nivel. Si tu resultado es
          mejor de lo esperado subes, y si es peor bajas. Los dos jugadores de una pareja suben o bajan lo mismo.
        </li>
        <li>
          Ganar 2-0 a una pareja de tu nivel sube 0,10 y ganar 2-1, 0,06. Perder 0-2 baja 0,10 y perder 1-2, 0,06.
        </li>
        <li>
          Ganar a una pareja de nivel más alto sube más (hasta 0,20), y ganar a una de nivel más bajo casi no sube.
        </li>
        <li>Ganando nunca bajas y perdiendo nunca subes. Un empate sube al de menos nivel y baja al de más.</li>
        <li>
          Quien no ha rellenado el formulario cuenta como 1,00. El formulario da como mucho{" "}
          {formatLevel(MAX_INITIAL)}: de ahí para arriba solo se sube jugando.
        </li>
        <li>Se recalcula con todos los partidos, así que si se corrige un resultado, el nivel se corrige solo.</li>
      </ul>
    </div>
  );
}
