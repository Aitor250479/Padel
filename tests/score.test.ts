import { formatGames, gameField, gamesMatchResult, parseGames, readGames } from "../src/lib/score.ts";

const expect = (cond: boolean, msg: string) => { console.log(cond ? "ok" : "FAIL", msg); if (!cond) process.exitCode = 1; };
const form = (a: string[], b: string[]) => (name: string) => {
  const m = /^games_(a|b)_(\d)$/.exec(name)!;
  return (m[1] === "a" ? a : b)[Number(m[2]) - 1] ?? "";
};
const sets = (r: ReturnType<typeof readGames>) => ("sets" in r ? r.sets : null);
const error = (r: ReturnType<typeof readGames>) => ("error" in r ? r.error : null);

expect(gameField("a", 1) === "games_a_1", "nombre de campo");
expect(sets(readGames(form([], [])))?.length === 0, "todo vacío vale (opcional)");
const r1 = readGames(form(["6", "3", "7"], ["4", "6", "5"]));
expect(formatGames(sets(r1)!) === "6-4 3-6 7-5", "tres sets");
expect(gamesMatchResult(sets(r1)!, { a: 2, b: 1 }) === null, "6-4 3-6 7-5 concuerda con 2-1");
expect(!!gamesMatchResult(sets(r1)!, { a: 2, b: 0 }), "6-4 3-6 7-5 no concuerda con 2-0");
expect(gamesMatchResult(sets(readGames(form(["6", "6"], ["2", "3"])))!, { a: 2, b: 0 }) === null, "2-0 en dos sets");
expect(gamesMatchResult(sets(readGames(form(["6", "2"], ["2", "6"])))!, { a: 1, b: 1 }) === null, "1-1 sin terminar");
expect(!!error(readGames(form(["6"], [""]))), "falta un número");
expect(!!error(readGames(form(["6", "4"], ["6", "6"]))), "set empatado");
expect(!!error(readGames(form(["a"], ["4"]))), "solo números");
expect(!!error(readGames(form(["-1"], ["4"]))), "sin negativos");
expect(!!error(readGames(form(["6", "", "6"], ["4", "", "3"]))), "sets en orden");
expect(!!error(readGames(form(["6", "6", "6"], ["4", "4", "3"]))), "sin tercer set tras 2-0");
expect(parseGames("6-4 3-6 7-5").length === 3 && parseGames("6-4 3-6 7-5")[2].a === 7, "leer lo guardado");
expect(parseGames("texto libre").length === 0, "texto antiguo sin números");
