import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Parses a date value safely, avoiding UTC-midnight timezone shift.
 * "2026-04-24" via new Date() becomes UTC midnight → shows 23/04 in UTC-3.
 * Appending T12:00:00 (local noon) keeps the correct date in any timezone.
 */
export function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T12:00:00');
  return new Date(s);
}

/** Format a date field from the DB as dd/MM/yyyy, never shifting the day. */
export function fmtDate(value, fmt = 'dd/MM/yyyy') {
  const d = parseLocalDate(value);
  if (!d || isNaN(d.getTime())) return '';
  return dateFnsFormat(d, fmt, { locale: ptBR });
}
