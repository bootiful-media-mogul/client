import { describe, expect, it } from 'vitest'
import { parseWaveform } from '../../src/composables/segmentAudio'

function waveform(magic: string, peaksPerSecond: number, durationMs: number, peaks: number[]) {
  const buffer = new ArrayBuffer(14 + peaks.length)
  const view = new DataView(buffer)
  for (let i = 0; i < 4; i++) view.setUint8(i, magic.charCodeAt(i))
  view.setUint16(4, peaksPerSecond)
  view.setUint32(6, durationMs)
  view.setUint32(10, peaks.length)
  peaks.forEach((peak, i) => view.setUint8(14 + i, peak))
  return buffer
}

describe('parseWaveform', () => {
  it('reads the format the processors write', () => {
    const parsed = parseWaveform(waveform('MWF1', 20, 2050, [0, 255, 64]))
    expect(parsed.peaksPerSecond).toBe(20)
    expect(parsed.durationSeconds).toBe(2.05)
    expect(parsed.peaks).toEqual([0, 1, 64 / 255])
  })

  it('reads a duration too long for a signed int16, big-endian', () => {
    expect(parseWaveform(waveform('MWF1', 20, 3_600_000, [])).durationSeconds).toBe(3600)
  })

  it('refuses anything else', () => {
    expect(() => parseWaveform(waveform('<htm', 20, 0, []))).toThrow(/not a waveform/)
  })
})
