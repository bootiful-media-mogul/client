import { describe, expect, it } from 'vitest'
import { parseTimecode } from '../../src/podcasts/segments/timecode'

describe('parseTimecode', () => {
  it('reads plain seconds', () => {
    expect(parseTimecode('90')).toBe(90)
    expect(parseTimecode('30.5')).toBe(30.5)
    expect(parseTimecode('30s')).toBe(30)
  })

  it('reads minutes and seconds, to the millisecond', () => {
    expect(parseTimecode('1:30')).toBe(90)
    expect(parseTimecode('0:30.125')).toBe(30.125)
    expect(parseTimecode(' 2:05 ')).toBe(125)
  })

  it('reads hours, minutes and seconds', () => {
    expect(parseTimecode('1:02:03.5')).toBe(3723.5)
  })

  it('refuses what is not a time', () => {
    for (const text of ['', 'abc', '1:75', '1::2', '1:2:3:4', '-5', '1.5:30', '1:30.'])
      expect(parseTimecode(text)).toBeNull()
  })
})
