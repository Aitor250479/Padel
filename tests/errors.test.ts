import assert from "node:assert/strict";
import { friendlyError } from "../src/lib/errors.ts";

assert.equal(friendlyError('duplicate key value violates unique constraint "pairs_name_key"'), "Ya existe una pareja con ese nombre.");
assert.equal(friendlyError('new row violates row-level security policy for table "matches"'), "No tienes permiso para hacer eso.");
assert.equal(friendlyError("TypeError: fetch failed"), "No se ha podido conectar. Comprueba la cobertura y vuelve a intentarlo.");
assert.equal(friendlyError("Una de las parejas ya tiene partido esa semana"), "Una de las parejas ya tiene partido esa semana");
assert.equal(friendlyError("El resultado se introduce desde la ficha del partido"), "El resultado se introduce desde la ficha del partido");
assert.match(friendlyError("something odd happened"), /No se ha podido guardar/);
assert.match(friendlyError(undefined), /No se ha podido guardar/);
console.log("ok errores");
