import {
  addDays,
  differenceInMinutes,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE, MONTHS_ES, WEEKDAYS_ES, WEEKDAYS_SHORT_ES } from "./constants";

export const TZ = process.env.BUSINESS_TIMEZONE || DEFAULT_TIMEZONE;

export function nowUtc(): Date {
  return new Date();
}

export function toZoned(date: Date): Date {
  return toZonedTime(date, TZ);
}

export function dateKeyInTZ(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

export function timeInTZ(date: Date): string {
  return formatInTimeZone(date, TZ, "HH:mm");
}

export function zonedToUtc(dateKey: string, minutesFromMidnight = 0): Date {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  const stamp = `${dateKey}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  return fromZonedTime(stamp, TZ);
}

export function minutesOfDayInTZ(date: Date): number {
  const t = timeInTZ(date);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function weekdayInTZ(date: Date): number {
  return toZonedTime(date, TZ).getDay();
}

export function weekdayOfKey(dateKey: string): number {
  return zonedToUtc(dateKey, 12 * 60).getUTCDay() === 0
    ? 0
    : Number(formatInTimeZone(zonedToUtc(dateKey, 12 * 60), TZ, "i")) % 7;
}

export function todayKey(): string {
  return dateKeyInTZ(new Date());
}

export function addDaysToKey(dateKey: string, days: number): string {
  const base = parseISO(`${dateKey}T12:00:00`);
  return format(addDays(base, days), "yyyy-MM-dd");
}

export function formatDateLong(date: Date): string {
  return formatInTimeZone(date, TZ, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateShort(date: Date): string {
  return formatInTimeZone(date, TZ, "d MMM yyyy", { locale: es });
}

export function formatDateNumeric(date: Date): string {
  return formatInTimeZone(date, TZ, "dd/MM/yyyy", { locale: es });
}

export function formatTime(date: Date): string {
  return formatInTimeZone(date, TZ, "h:mm a", { locale: es });
}

export function formatDateTime(date: Date): string {
  return formatInTimeZone(date, TZ, "d MMM yyyy · h:mm a", { locale: es });
}

export function formatDateKeyLong(dateKey: string): string {
  return formatDateLong(zonedToUtc(dateKey, 12 * 60));
}

export function formatDateKeyShort(dateKey: string): string {
  return formatDateShort(zonedToUtc(dateKey, 12 * 60));
}

export function dayLabel(dateKey: string): { weekday: string; day: string; month: string } {
  const d = zonedToUtc(dateKey, 12 * 60);
  return {
    weekday: WEEKDAYS_SHORT_ES[weekdayInTZ(d)],
    day: formatInTimeZone(d, TZ, "d"),
    month: MONTHS_ES[Number(formatInTimeZone(d, TZ, "M")) - 1],
  };
}

export function weekdayName(dateKey: string): string {
  return WEEKDAYS_ES[weekdayOfKey(dateKey)] ?? "";
}

export function minutesToTimeLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "p.m." : "a.m.";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function minutesToInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function inputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatMoney(cents: number, currency = "GTQ"): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatMoneyShort(cents: number): string {
  return `Q${(cents / 100).toLocaleString("es-GT", { minimumFractionDigits: 0 })}`;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function minutesBetween(a: Date, b: Date): number {
  return differenceInMinutes(b, a);
}

export function startOfTodayTZ(): Date {
  return zonedToUtc(todayKey(), 0);
}

export function isSameDateKey(date: Date, key: string): boolean {
  return dateKeyInTZ(date) === key;
}

export function calendarDays(fromKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysToKey(fromKey, i));
}

export function humanRelative(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 60) return diffMin >= 0 ? `en ${diffMin} min` : `hace ${Math.abs(diffMin)} min`;
  const diffH = Math.round(diffMin / 60);
  if (Math.abs(diffH) < 24) return diffH >= 0 ? `en ${diffH} h` : `hace ${Math.abs(diffH)} h`;
  const diffD = Math.round(diffH / 24);
  return diffD >= 0 ? `en ${diffD} día${diffD === 1 ? "" : "s"}` : `hace ${Math.abs(diffD)} día${Math.abs(diffD) === 1 ? "" : "s"}`;
}

export function startOfWeekKey(dateKey: string): string {
  const weekday = weekdayOfKey(dateKey);
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDaysToKey(dateKey, offset);
}

export { startOfDay };
