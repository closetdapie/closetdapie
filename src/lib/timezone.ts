/* Helper central de timezone — TUDO opera em horário do Brasil (BRT, UTC-3).
   Servidor Vercel roda em UTC, então precisamos converter explicitamente. */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  subMonths, subDays,
} from 'date-fns';

export const TZ = 'America/Sao_Paulo';

// Pega o "agora" no fuso BR. Retorna Date que, quando lido como UTC, representa BRT.
export function agoraBR(): Date {
  return toZonedTime(new Date(), TZ);
}

// Formata uma Date em horário BR
export function fmtBR(date: Date | string | number, formato: string, locale?: Locale): string {
  return formatInTimeZone(date, TZ, formato, { locale });
}

// Converte uma Date "BR wall-clock" (vinda de startOfDay etc no TZ BR) pra UTC absoluto
export function paraUTC(d: Date): Date {
  return fromZonedTime(d, TZ);
}

// Helpers de intervalo no fuso BR — retornam Dates em UTC absoluto
// pra usar em queries Drizzle (DB armazena em UTC)
export function inicioDiaBR(d: Date = agoraBR()): Date {
  return paraUTC(startOfDay(d));
}

export function fimDiaBR(d: Date = agoraBR()): Date {
  return paraUTC(endOfDay(d));
}

export function inicioMesBR(d: Date = agoraBR()): Date {
  return paraUTC(startOfMonth(d));
}

export function fimMesBR(d: Date = agoraBR()): Date {
  return paraUTC(endOfMonth(d));
}

export function inicioSemanaBR(d: Date = agoraBR()): Date {
  return paraUTC(startOfWeek(d, { weekStartsOn: 1 }));
}

export function fimSemanaBR(d: Date = agoraBR()): Date {
  return paraUTC(endOfWeek(d, { weekStartsOn: 1 }));
}

export function subDiasBR(d: Date, n: number): Date {
  return subDays(d, n);
}

export function subMesesBR(d: Date, n: number): Date {
  return subMonths(d, n);
}

import type { Locale } from 'date-fns';
