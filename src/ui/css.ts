/**
 * a css `url()` for any url, quoted. a production build inlines small svgs as
 * `data:image/svg+xml,...` uris that keep their single quotes and parentheses, and those
 * aren't allowed in an unquoted `url()`: the browser throws the whole declaration away.
 */
export function cssUrl(url: string): string {
  const escaped = url.replace(/["\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\a ')
  return `url("${escaped}")`
}
