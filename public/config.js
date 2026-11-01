// a deployment never serves this file: nginx answers /config.js itself, from the environment
// (see .github/workflows/nginx-buildpack-config/nginx.conf). this is what `npm run dev` gets.
window.MOGUL_API_URL = ''
