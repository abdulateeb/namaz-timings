/**
 * Prayer times and Qibla maths.
 *
 * Fiqh choices (Ahle Hadees):
 *  - Asr starts when an object's shadow equals its own length plus its noon
 *    shadow (Jibreel's imamat hadith, Abu Dawud 393, Tirmidhi 149). adhan
 *    calls this Madhab.Shafi.
 *  - Isha ends at half of the night, Maghrib to the next Fajr
 *    (Sahih Muslim 612, hadith of Abdullah bin Amr).
 *
 * The calculation method is picked from the coordinates, so the app gives
 * the locally accepted Fajr and Isha angles wherever the phone is.
 */
import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes, Qibla } from 'adhan';

export type PrayerKey = 'tahajjud' | 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerSlot {
  key: PrayerKey;
  name: string;
  start: Date;
  end: Date;
}

export interface DayPlan {
  slots: PrayerSlot[];
  sunrise: Date;
  /** Slot whose window contains now, if any. */
  current: PrayerSlot | null;
  /** Next slot to start after now (may be tomorrow's Fajr). */
  next: PrayerSlot;
  methodName: string;
}

const NAMES: Record<PrayerKey, string> = {
  tahajjud: 'Tahajjud',
  fajr: 'Fajr',
  dhuhr: 'Zuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

function inBox(lat: number, lon: number, s: number, n: number, w: number, e: number) {
  return lat >= s && lat <= n && lon >= w && lon <= e;
}

/** Regional method by coordinates. Falls back to Muslim World League. */
function methodFor(lat: number, lon: number): { params: CalculationParameters; name: string } {
  if (inBox(lat, lon, 5, 38, 60, 98)) return { params: CalculationMethod.Karachi(), name: 'Karachi' }; // South Asia
  if (inBox(lat, lon, 12, 33, 34, 60)) return { params: CalculationMethod.UmmAlQura(), name: 'Umm al-Qura' }; // Arabia
  if (inBox(lat, lon, 22, 32, 24, 37)) return { params: CalculationMethod.Egyptian(), name: 'Egyptian' };
  if (inBox(lat, lon, 15, 72, -170, -50)) return { params: CalculationMethod.NorthAmerica(), name: 'ISNA' };
  if (inBox(lat, lon, -11, 7, 95, 141)) return { params: CalculationMethod.Singapore(), name: 'Singapore' };
  if (inBox(lat, lon, 35, 43, 25, 45)) return { params: CalculationMethod.Turkey(), name: 'Diyanet' };
  return { params: CalculationMethod.MuslimWorldLeague(), name: 'Muslim World League' };
}

function timesFor(coords: Coordinates, date: Date, params: CalculationParameters) {
  return new PrayerTimes(coords, date, params);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function slotsFor(coords: Coordinates, day: Date, params: CalculationParameters): { slots: PrayerSlot[]; sunrise: Date } {
  const t = timesFor(coords, day, params);
  const tomorrow = timesFor(coords, addDays(day, 1), params);
  const yesterday = timesFor(coords, addDays(day, -1), params);
  const halfNight = new Date(t.maghrib.getTime() + (tomorrow.fajr.getTime() - t.maghrib.getTime()) / 2);
  // Tahajjud: the last third of the night before this day's Fajr (Bukhari 1145), until Fajr.
  const night = t.fajr.getTime() - yesterday.maghrib.getTime();
  const lastThird = new Date(t.fajr.getTime() - night / 3);
  const slots: PrayerSlot[] = [
    { key: 'tahajjud', name: NAMES.tahajjud, start: lastThird, end: t.fajr },
    { key: 'fajr', name: NAMES.fajr, start: t.fajr, end: t.sunrise },
    { key: 'dhuhr', name: NAMES.dhuhr, start: t.dhuhr, end: t.asr },
    { key: 'asr', name: NAMES.asr, start: t.asr, end: t.maghrib },
    { key: 'maghrib', name: NAMES.maghrib, start: t.maghrib, end: t.isha },
    { key: 'isha', name: NAMES.isha, start: t.isha, end: halfNight },
  ];
  return { slots, sunrise: t.sunrise };
}

export function planDay(lat: number, lon: number, now: Date): DayPlan {
  const coords = new Coordinates(lat, lon);
  const { params, name } = methodFor(lat, lon);
  params.madhab = Madhab.Shafi;

  const today = slotsFor(coords, now, params);
  const yesterday = slotsFor(coords, addDays(now, -1), params);
  const tomorrow = slotsFor(coords, addDays(now, 1), params);

  const t = now.getTime();
  const within = (s: PrayerSlot) => t >= s.start.getTime() && t < s.end.getTime();

  // Before today's Fajr, the night still belongs to yesterday's Isha window.
  const yIsha = yesterday.slots[yesterday.slots.length - 1];
  const current = today.slots.find(within) ?? (within(yIsha) ? yIsha : null);
  const next = today.slots.find((s) => s.start.getTime() > t) ?? tomorrow.slots[0];

  return { slots: today.slots, sunrise: today.sunrise, current, next, methodName: name };
}

const KAABA = { lat: 21.4225, lon: 39.8262 };

export function qiblaBearing(lat: number, lon: number): number {
  return Qibla(new Coordinates(lat, lon));
}

export function distanceToKaabaKm(lat: number, lon: number): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (KAABA.lat - lat) * rad;
  const dLon = (KAABA.lon - lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(KAABA.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ---------- formatting (manual, so it does not depend on Intl support) ---------- */

/** 24-hour "HH:MM", e.g. "05:11", "18:56". */
export function formatTime24(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function formatTime(d: Date): { hm: string; ampm: string } {
  const h = d.getHours();
  const m = d.getMinutes();
  return { hm: `${h % 12 === 0 ? 12 : h % 12}:${m < 10 ? '0' : ''}${m}`, ampm: h < 12 ? 'am' : 'pm' };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDate(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Ula',
  'Jumada al-Thani',
  'Rajab',
  'Shaban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qadah',
  'Dhu al-Hijjah',
];

/** Tabular (arithmetic) Islamic calendar; fallback when Intl lacks Umm al-Qura. */
function tabularHijri(d: Date): { day: number; month: number; year: number } {
  const jd = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) + 2440588;
  const l0 = jd - 1948440 + 10632;
  const n = Math.floor((l0 - 1) / 10631);
  const l1 = l0 - 10631 * n + 354;
  const j =
    Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) + Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
  const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l2) / 709);
  const day = l2 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year };
}

/** "15 Jumada al-Thani 1448": day, full month name, year. */
export function formatHijriLong(d: Date): string {
  let parts: { day: number; month: number; year: number } | null = null;
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
    if (f.resolvedOptions().calendar.startsWith('islamic')) {
      const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
      const day = parseInt(p.day, 10);
      const month = parseInt(p.month, 10);
      const year = parseInt(p.year, 10);
      if (day && month && year) parts = { day, month, year };
    }
  } catch {
    parts = null;
  }
  const h = parts ?? tabularHijri(d);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year}`;
}

/** "25 November 2026": day, full month name, year. */
export function formatGregorianLong(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Hijri date via Intl when the engine supports the Islamic calendar; otherwise null. */
export function formatHijri(d: Date): string | null {
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!f.resolvedOptions().calendar.startsWith('islamic')) return null;
    return f.format(d).replace(/\s*AH$/, '') + ' AH';
  } catch {
    return null;
  }
}
