import type { Publication, PublishableReference } from '@/services'

/**
 * the home page's calendar: every publication, about anything, on the day it went out or
 * is due to. nothing here knows what a plugin does. a publication is a plugin, some
 * dates, a state and zero or more outcomes, and that is all the calendar looks at.
 */

export type CalendarView = 'week' | 'month'

/** what a publication is doing, worked out from those generic fields alone */
export type PublicationStatus =
  | 'published'
  | 'partial'
  | 'failed'
  | 'publishing'
  | 'scheduled'
  | 'withdrawn'

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b)

/** the day in the browser's zone, as yyyy-mm-dd: what the server calls a mogul status's date */
export function dayKey(d: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** weeks start on monday */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))

/**
 * the moment a publication belongs to: when it went out, else when it's due, else when it
 * was asked for (as soon as possible means right then). the server picks the same one
 * when it decides what's in a range.
 */
export function whenOf(p: Publication): Date {
  return new Date(p.published ?? p.scheduled ?? p.created)
}

export function statusOf(p: Publication, now: Date = new Date()): PublicationStatus {
  if (p.state === 'unpublished') return 'withdrawn'
  if (p.state !== 'published')
    return p.scheduled && new Date(p.scheduled) > now ? 'scheduled' : 'publishing'
  const outcomes = p.outcomes ?? []
  const failed = outcomes.filter((o) => !o.success).length
  if (failed === 0) return 'published'
  return failed === outcomes.length ? 'failed' : 'partial'
}

export const hasFailure = (s: PublicationStatus) => s === 'failed' || s === 'partial'

/** one publishable on one day: an episode and everything it went out to that day is one card */
export interface CalendarEntry {
  readonly key: string
  readonly publishable: PublishableReference | null
  readonly publications: Array<Publication>
  readonly when: Date
}

/** a day's entries, by dayKey, each day's in the order they go out */
export function entriesByDay(publications: Array<Publication>): Map<string, Array<CalendarEntry>> {
  const groups = new Map<string, Array<Publication>>()
  for (const p of publications) {
    const who = p.publishable ? `${p.publishable.type}:${p.publishable.id}` : `publication:${p.id}`
    const k = `${who}@${dayKey(whenOf(p))}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(p)
  }
  const days = new Map<string, Array<CalendarEntry>>()
  for (const [key, pubs] of groups) {
    pubs.sort((a, b) => whenOf(a).getTime() - whenOf(b).getTime())
    const when = whenOf(pubs[0])
    const day = dayKey(when)
    if (!days.has(day)) days.set(day, [])
    days.get(day)!.push({ key, publishable: pubs[0].publishable, publications: pubs, when })
  }
  for (const list of days.values()) list.sort((a, b) => a.when.getTime() - b.when.getTime())
  return days
}

/** upcoming if nothing on it has gone out yet, failed if anything on it failed */
export function entryFlags(e: CalendarEntry, now: Date = new Date()) {
  const statuses = e.publications.map((p) => statusOf(p, now))
  return {
    upcoming: statuses.every((s) => s === 'scheduled' || s === 'publishing'),
    failed: statuses.some(hasFailure),
    withdrawn: statuses.every((s) => s === 'withdrawn')
  }
}

/** the days a view shows: a week, or a month padded out to whole weeks */
export function visibleDays(view: CalendarView, anchor: Date): Array<Date> {
  if (view === 'week') {
    const start = startOfWeek(anchor)
    return [...Array(7)].map((_, i) => addDays(start, i))
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  const end = startOfWeek(addDays(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1), 6))
  const days: Array<Date> = []
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d)
  return days
}

/** the range to ask the server for: [first visible day, the day after the last) */
export function visibleRange(view: CalendarView, anchor: Date): [Date, Date] {
  const days = visibleDays(view, anchor)
  return [days[0], addDays(days[days.length - 1], 1)]
}

/** a week or a month on from anchor, either way */
export function step(view: CalendarView, anchor: Date, direction: number): Date {
  return view === 'week'
    ? addDays(anchor, 7 * direction)
    : new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
}
