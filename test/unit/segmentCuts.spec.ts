import { describe, expect, it } from 'vitest'
import { compute } from '../../src/podcasts/segments/segmentCuts'
import cases from './segment-cuts-cases.json'

// the same cases the api's SegmentCutsTest runs; the two copies must stay identical
const pairs = (ranges: Array<Array<number>> | null) =>
  ranges ? ranges.map(([start, end]) => ({ start, end })) : null

describe('segment cuts, shared with the api', () => {
  for (const c of cases as Array<any>) {
    it(c.name, () => {
      expect(
        compute(c.duration, pairs(c.kept), c.detections, c.filters, new Set(c.restored))
      ).toEqual(pairs(c.expected))
    })
  }
})
