declare global {
  interface Window {
    MOGUL_API_URL?: string
  }
}

/**
 * the api's public base URL. a deployment sets it at runtime: nginx answers /config.js from
 * the MOGUL_SERVICE_HOST environment variable (see .github/workflows/nginx-buildpack-config),
 * so one image works on any host. VITE_API_URL, compiled in, is the fallback for `npm run dev`
 * and for a deployment that doesn't set it.
 */
export function apiUrl(): string {
  return window.MOGUL_API_URL || import.meta.env.VITE_API_URL
}
