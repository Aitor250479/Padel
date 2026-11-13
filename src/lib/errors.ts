/**
 * Convierte los mensajes técnicos (en inglés) de Supabase y Postgres en
 * avisos que entienda cualquiera. Los mensajes propios de la base de datos
 * ya están en español y se dejan tal cual.
 */
const RULES: [RegExp, string][] = [
  [/duplicate key.*pairs_name/i, "Ya existe una pareja con ese nombre."],
  [/duplicate key.*friendly_players_match_id_side_slot/i, "Ese hueco ya está ocupado. Elige otro."],
  [/duplicate key.*friendly_players_pkey/i, "Ese jugador ya está apuntado a este amistoso."],
  [/duplicate key/i, "Eso ya estaba guardado."],
  [/row-level security|permission denied|not authorized/i, "No tienes permiso para hacer eso."],
  [/violates foreign key/i, "No se puede: hay otros datos que dependen de esto."],
  [/violates check constraint|invalid input syntax/i, "Algún dato no es válido. Revísalo y vuelve a intentarlo."],
  [/jwt expired|refresh token|session.*(missing|expired)|auth session/i, "Tu sesión ha caducado. Sal y vuelve a entrar."],
  [/fetch failed|failed to fetch|network|timeout|timed out|ECONN|ENOTFOUND/i, "No se ha podido conectar. Comprueba la cobertura y vuelve a intentarlo."],
  [/should be different from the old password/i, "La contraseña nueva tiene que ser distinta de la anterior."],
  [/at least 6 characters/i, "La contraseña debe tener al menos 6 caracteres."],
  [/rate limit|too many requests/i, "Demasiados intentos seguidos. Espera un momento y vuelve a probar."],
];

const SPANISH = /[áéíóúñ¿¡]|\b(el|la|los|las|de|que|una?|solo|ya|no|partido|pareja)\b/i;

export function friendlyError(message: string | null | undefined) {
  const msg = (message ?? "").trim();
  for (const [pattern, text] of RULES) if (pattern.test(msg)) return text;
  if (msg && SPANISH.test(msg)) return msg;
  return "No se ha podido guardar. Inténtalo otra vez y, si se repite, avisa a Aitor.";
}
