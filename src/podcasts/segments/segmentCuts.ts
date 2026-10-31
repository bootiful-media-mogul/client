/**
 * the editor's preview of what the server renders: the ranges kept by hand, minus the
 * automatic cuts. this mirrors SegmentCuts in the api, and the two are held to the same
 * cases: test/unit/segment-cuts-cases.json here, src/test/resources/segment-cuts/cases.json
 * there. keep them identical. everything is in milliseconds.
 */

export interface Range {
  start: number
  end: number
}

export interface Detection {
  start: number
  end: number
  // cleanvoice's kind, like FILLER_SOUND; absent for a silence
  kind?: string | null
}

export interface Detections {
  cleanvoice: Array<Detection>
  silences: Array<Detection>
}

export interface Filters {
  fillers: boolean
  stutters: boolean
  silences: boolean
  silenceLongerThan: number
  silenceLeave: number
}

export const FILLER = 'FILLER_SOUND'
export const STUTTER = 'STUTTERING'
const SHORTEST_PIECE = 10

export function detectionId(detection: Detection): string {
  return (detection.kind ?? 'silence') + '@' + detection.start
}

// about 45% of a filler, between a tenth and a third of a second, never longer than it
export function pauseFor(fillerLength: number): number {
  const pause = Math.max(100, Math.min(350, Math.round(fillerLength * 0.45)))
  return Math.min(fillerLength, pause)
}

/**
 * every stretch the automatic cuts would take out, with the detection responsible, so the
 * editor can draw them and put any one of them back
 */
export function removals(
  detections: Detections | null,
  filters: Filters | null,
  restored: Set<string>
): Array<Range & { id: string; kind: string }> {
  const out: Array<Range & { id: string; kind: string }> = []
  if (!detections || !filters) return out
  for (const d of detections.cleanvoice) {
    const wanted =
      (filters.fillers && d.kind === FILLER) || (filters.stutters && d.kind === STUTTER)
    if (!wanted || restored.has(detectionId(d))) continue
    out.push({
      id: detectionId(d),
      kind: d.kind!,
      start: d.start + pauseFor(d.end - d.start),
      end: d.end
    })
  }
  if (filters.silences)
    for (const d of detections.silences) {
      if (d.end - d.start <= filters.silenceLongerThan || restored.has(detectionId(d))) continue
      const half = Math.floor(filters.silenceLeave / 2)
      out.push({ id: detectionId(d), kind: 'SILENCE', start: d.start + half, end: d.end - half })
    }
  return out.filter((r) => r.end > r.start)
}

export function compute(
  duration: number,
  kept: Array<Range> | null,
  detections: Detections | null,
  filters: Filters | null,
  restored: Set<string>
): Array<Range> {
  const byHand = kept && kept.length ? kept : [{ start: 0, end: duration }]
  if (!detections || !filters) return byHand
  const sorted = removals(detections, filters, restored)
    .map((r) => [r.start, r.end])
    .sort((a, b) => a[0] - b[0])
  const merged: Array<number[]> = []
  for (const r of sorted) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  const result: Array<Range> = []
  for (const range of byHand) {
    let from = range.start
    for (const r of merged) {
      if (r[1] <= from || r[0] >= range.end) continue
      if (r[0] - from >= SHORTEST_PIECE) result.push({ start: from, end: r[0] })
      from = Math.max(from, r[1])
    }
    if (range.end - from >= SHORTEST_PIECE) result.push({ start: from, end: range.end })
  }
  // nothing left would render as "keep everything", which is the opposite
  return result.length ? result : byHand
}
