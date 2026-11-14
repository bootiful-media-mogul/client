import { describe, expect, it } from 'vitest'
import { Publication, PublicationOutcome, PublishableReference } from '../../src/services'
import {
  dayKey,
  entriesByDay,
  entryFlags,
  statusOf,
  step,
  visibleDays,
  visibleRange,
  whenOf
} from '../../src/home/calendar'

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min)

function publication(
  id: number,
  fields: {
    state?: string
    created?: Date
    published?: Date | null
    scheduled?: Date | null
    outcomes?: Array<boolean>
    publishable?: PublishableReference | null
  }
): Publication {
  const outcomes = (fields.outcomes ?? []).map(
    (success, i) =>
      new PublicationOutcome(i, success, '', 'twitter', success ? '' : 'nope', new Date(), null)
  )
  return new Publication(
    id,
    'mogulAyrshare',
    (fields.created ?? at(2026, 11, 1)).getTime(),
    (fields.published?.getTime() ?? null) as any,
    '',
    fields.state ?? 'published',
    outcomes,
    fields.scheduled?.getTime() ?? null,
    fields.publishable === undefined
      ? new PublishableReference('episode', 1, 'Ep 1')
      : fields.publishable
  )
}

describe("the home page's calendar", () => {
  const now = at(2026, 11, 13, 12)

  it('puts a publication where it went out, else where it is due, else when it was asked for', () => {
    expect(whenOf(publication(1, { published: at(2026, 11, 10, 8) }))).toEqual(at(2026, 11, 10, 8))
    expect(whenOf(publication(2, { state: 'pending', scheduled: at(2026, 11, 20, 9) }))).toEqual(
      at(2026, 11, 20, 9)
    )
    expect(whenOf(publication(3, { state: 'pending', created: at(2026, 11, 13, 11) }))).toEqual(
      at(2026, 11, 13, 11)
    )
  })

  it('works out what a publication is doing from its state, dates and outcomes', () => {
    const published = at(2026, 11, 10)
    expect(statusOf(publication(1, { published, outcomes: [true, true] }), now)).toBe('published')
    expect(statusOf(publication(1, { published, outcomes: [true, false] }), now)).toBe('partial')
    expect(statusOf(publication(1, { published, outcomes: [false] }), now)).toBe('failed')
    expect(statusOf(publication(1, { state: 'unpublished', published }), now)).toBe('withdrawn')
    expect(statusOf(publication(1, { state: 'pending', scheduled: at(2026, 11, 20) }), now)).toBe(
      'scheduled'
    )
    // overdue, or for as soon as possible: it's going out now
    expect(statusOf(publication(1, { state: 'pending' }), now)).toBe('publishing')
  })

  it('makes one card per publishable per day, in the order they go out', () => {
    const episode = new PublishableReference('episode', 1, 'Ep 1')
    const post = new PublishableReference('post', 7, 'A post')
    const days = entriesByDay([
      publication(1, { published: at(2026, 11, 10, 15), publishable: episode }),
      publication(2, { published: at(2026, 11, 10, 9), publishable: episode }),
      publication(3, { published: at(2026, 11, 10, 12), publishable: post }),
      publication(4, { published: at(2026, 11, 11, 9), publishable: episode })
    ])
    const tenth = days.get('2026-11-10')!
    expect(tenth.map((e) => e.publishable!.type)).toEqual(['episode', 'post'])
    expect(tenth[0].publications.map((p) => p.id)).toEqual([2, 1])
    expect(tenth[0].when).toEqual(at(2026, 11, 10, 9))
    expect(days.get('2026-11-11')!.map((e) => e.publications.map((p) => p.id))).toEqual([[4]])
  })

  it('keeps publications about something it can no longer name apart', () => {
    const days = entriesByDay([
      publication(1, { published: at(2026, 11, 10), publishable: null }),
      publication(2, { published: at(2026, 11, 10), publishable: null })
    ])
    expect(days.get('2026-11-10')!.length).toBe(2)
  })

  it('flags a card that has not gone out yet, and one where something failed', () => {
    const [upcoming] = entriesByDay([
      publication(1, { state: 'pending', scheduled: at(2026, 11, 20) })
    ]).get('2026-11-20')!
    expect(entryFlags(upcoming, now)).toEqual({ upcoming: true, failed: false, withdrawn: false })
    const [failed] = entriesByDay([
      publication(1, { published: at(2026, 11, 10), outcomes: [true, false] })
    ]).get('2026-11-10')!
    expect(entryFlags(failed, now).failed).toBe(true)
  })

  it('shows a week from monday, and a month padded out to whole weeks', () => {
    // a friday
    const week = visibleDays('week', at(2026, 11, 13))
    expect(week.map(dayKey)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15'
    ])
    // november 2026 starts on a sunday and ends on a monday
    const month = visibleDays('month', at(2026, 11, 13))
    expect(dayKey(month[0])).toBe('2026-10-26')
    expect(dayKey(month[month.length - 1])).toBe('2026-12-06')
    expect(month.length % 7).toBe(0)
    const [from, to] = visibleRange('month', at(2026, 11, 13))
    expect([dayKey(from), dayKey(to)]).toEqual(['2026-10-26', '2026-12-07'])
  })

  it('steps a week or a month at a time', () => {
    expect(dayKey(step('week', at(2026, 11, 13), 1))).toBe('2026-11-20')
    expect(dayKey(step('month', at(2026, 11, 13), -1))).toBe('2026-10-01')
  })
})
