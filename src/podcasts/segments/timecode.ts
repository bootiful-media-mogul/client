/**
 * reads a time someone typed: plain seconds ("90", "90.5"), minutes and seconds
 * ("1:30", "1:30.25"), or hours, minutes and seconds ("1:02:03.5"). a trailing "s" is
 * fine. returns seconds, or null for anything that isn't a time.
 */
export function parseTimecode(text: string): number | null {
  const trimmed = text.trim().replace(/s$/i, '')
  if (!trimmed) return null
  const parts = trimmed.split(':')
  if (parts.length > 3) return null
  // only the seconds may have a fraction; hours and minutes are whole
  const numbers = parts.map((part, index) =>
    (index === parts.length - 1 ? /^\d+(\.\d+)?$/ : /^\d+$/).test(part) ? Number(part) : NaN
  )
  if (numbers.some(Number.isNaN)) return null
  // past the first part, minutes and seconds stay under 60: "1:75" is a typo, not 2:15
  if (numbers.slice(1).some((n) => n >= 60)) return null
  return numbers.reduce((total, n) => total * 60 + n, 0)
}
