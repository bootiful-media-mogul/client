import { ref } from 'vue'

/**
 * downloads an audio file and reduces it to a list of normalized (0..1) peaks
 * suitable for drawing a waveform.
 *
 * this happens entirely in the browser, which means the whole file gets downloaded
 * and decoded every time. that's fine for a first pass at the editor UI, but before
 * this goes to production the peaks should be computed once on the server and
 * served alongside the segment.
 *
 * decoding happens in an 8kHz OfflineAudioContext so the browser resamples while it
 * decodes. an hour of 44.1kHz stereo is ~1.2GB of Float32 samples; at 8kHz it's a
 * fraction of that, and a waveform doesn't need the extra fidelity.
 */
const DECODE_SAMPLE_RATE = 8000
const PEAKS_PER_SECOND = 10

export function useAudioPeaks() {
  const peaks = ref<number[]>([])
  const duration = ref<number>(0)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function load(url: string) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`couldn't download ${url}: HTTP ${response.status}`)
      const encoded = await response.arrayBuffer()
      const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE)
      const decoded = await context.decodeAudioData(encoded)
      duration.value = decoded.duration
      peaks.value = computePeaks(
        decoded,
        Math.max(1, Math.ceil(decoded.duration * PEAKS_PER_SECOND))
      )
    } catch (e) {
      console.error("couldn't compute the waveform for", url, e)
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  return { peaks, duration, loading, error, load }
}

function computePeaks(audio: AudioBuffer, buckets: number): number[] {
  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i))
  const length = audio.length
  const result = new Array<number>(buckets)
  let loudest = 0
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = Math.floor((bucket * length) / buckets)
    const end = Math.max(start + 1, Math.floor(((bucket + 1) * length) / buckets))
    let peak = 0
    for (const channel of channels) {
      for (let i = start; i < end && i < length; i++) {
        const sample = Math.abs(channel[i])
        if (sample > peak) peak = sample
      }
    }
    result[bucket] = peak
    if (peak > loudest) loudest = peak
  }
  return loudest > 0 ? result.map((peak) => peak / loudest) : result
}
