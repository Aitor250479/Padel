import { input } from "../parejas/ui";

export type Competition = { id: string; name: string };
export type Category = { id: string; name: string; competition_id: string };
export type Season = { id: string; name: string; kind: "parejas" | "individual"; category_id: string };

/** Tipo de la primera temporada de una categoría. */
export function KindSelect() {
  return (
    <select name="kind" defaultValue="parejas" className={input} aria-label="Tipo de temporada">
      <option value="parejas">Por parejas</option>
      <option value="individual">Individual</option>
    </select>
  );
}
