import { describe, expect, it } from 'vitest'
import { cssUrl } from '@/ui/css'

describe('cssUrl', () => {
  it('quotes an inlined svg, single quotes and parentheses and all', () => {
    const uri =
      "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20style='fill:var(--paper,transparent)'%3e"
    expect(cssUrl(uri)).toBe(`url("${uri}")`)
  })

  it('escapes what would end the string early', () => {
    expect(cssUrl('a"b\\c')).toBe('url("a\\"b\\\\c")')
    expect(cssUrl('a\nb')).toBe('url("a\\a b")')
  })

  it('leaves a plain url alone, apart from the quotes', () => {
    expect(cssUrl('/assets/podcast-abc123.svg')).toBe('url("/assets/podcast-abc123.svg")')
  })
})
