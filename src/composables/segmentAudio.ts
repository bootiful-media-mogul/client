/**
 * reads what the segment audio editor draws and plays: the waveform the processors drew
 * on upload, and the uploaded audio itself. both come through the gateway at /api, same
 * origin as the app, so there's no CORS to worry about and the files can stay private.
 */

export interface Waveform {
  // the waveform's own idea of the audio's length, which is exact; the mp3's isn't
  durationSeconds: number
  peaksPerSecond: number
  // 0 (silence) to 1 (the loudest moment in the file)
  peaks: number[]
}

const MAGIC = 'MWF1'

/**
 * the format the processors write (see AudioWaveform there): big-endian, the ascii bytes
 * MWF1, a uint16 of peaks per second, a uint32 duration in milliseconds, a uint32 count
 * of peaks, and then that many bytes, one per peak, 0 to 255.
 */
export function parseWaveform(buffer: ArrayBuffer): Waveform {
  const view = new DataView(buffer)
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4))
  if (magic !== MAGIC) throw new Error(`not a waveform: it starts with "${magic}", not "${MAGIC}"`)
  const peaksPerSecond = view.getUint16(4)
  const durationMilliseconds = view.getUint32(6)
  const count = view.getUint32(10)
  const bytes = new Uint8Array(buffer, 14, count)
  return {
    durationSeconds: durationMilliseconds / 1000,
    peaksPerSecond,
    peaks: Array.from(bytes, (peak) => peak / 255)
  }
}

async function download(url: string): Promise<Response> {
  const response = await fetch('/api' + url)
  if (!response.ok) throw new Error(`couldn't download ${url}: HTTP ${response.status}`)
  return response
}

export async function loadWaveform(url: string): Promise<Waveform> {
  return parseWaveform(await (await download(url)).arrayBuffer())
}

/**
 * the whole file, as an object url. the editor seeks constantly, and a blob seeks
 * anywhere instantly without depending on the server answering range requests. revoke it
 * with URL.revokeObjectURL when done.
 */
export async function loadAudio(url: string): Promise<string> {
  return URL.createObjectURL(await (await download(url)).blob())
}
