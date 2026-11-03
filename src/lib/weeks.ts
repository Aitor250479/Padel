// Fechas como texto "YYYY-MM-DD" y calculadas en UTC para evitar líos de zona horaria.

export const HOURS = Array.from({ length: 15 }, (_, i) => 8 + i); // 8:00 a 22:00
export const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export function mondayOf(iso: string) {
  const dow = (toDate(iso).getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(iso, -dow);
}

/** Fecha de hoy en España. */
export function todayInSpain() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

/**
 * Semana que se muestra por defecto: la actual de lunes a jueves, y la siguiente
 * de viernes a domingo, que es cuando se suele organizar la semana que viene.
 */
export function defaultWeek() {
  const today = todayInSpain();
  const dow = (toDate(today).getUTCDay() + 6) % 7;
  return dow >= 4 ? addDays(mondayOf(today), 7) : mondayOf(today);
}

/** Valida el parámetro ?semana= y lo normaliza al lunes. */
export function parseWeek(param: string | undefined) {
  if (param && ISO.test(param) && !Number.isNaN(toDate(param).getTime())) return mondayOf(param);
  return defaultWeek();
}

export function weekDays(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDay(iso: string) {
  const d = toDate(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function formatWeek(weekStart: string) {
  return `${formatDay(weekStart)} al ${formatDay(addDays(weekStart, 6))}`;
}

export function slotKey(day: string, hour: number) {
  return `${day}|${hour}`;
}

/** Fecha y hora actuales en España, como "YYYY-MM-DDTHH:MM". */
export function nowInSpain() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
