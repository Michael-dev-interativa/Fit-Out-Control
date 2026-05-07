import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Parses a date value safely, avoiding UTC-midnight timezone shift.
 *
 * The API can return dates in several formats:
 *   - "2026-04-24"              (pg date as string)
 *   - "2026-04-24T00:00:00.000Z" (pg Date object → JSON.stringify → ISO string at UTC midnight)
 *
 * In both cases new Date(value) would produce UTC midnight → shows 23/04 in UTC-3.
 * We extract just the YYYY-MM-DD part and anchor it to local noon so the day
 * is always correct regardless of the viewer's timezone (±12h from UTC).
 */
export function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    // Already a Date object — re-anchor using its UTC date to avoid offset issues
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return new Date(`${y}-${m}-${d}T12:00:00`);
  }
  const s = String(value).trim();
  // Extract YYYY-MM-DD from any ISO string ("2026-04-24" or "2026-04-24T00:00:00.000Z")
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return new Date(match[1] + 'T12:00:00');
  return new Date(s);
}

/** Format a date field from the DB as dd/MM/yyyy, never shifting the day. */
export function fmtDate(value, fmt = 'dd/MM/yyyy') {
  const d = parseLocalDate(value);
  if (!d || isNaN(d.getTime())) return '';
  return dateFnsFormat(d, fmt, { locale: ptBR });
}
