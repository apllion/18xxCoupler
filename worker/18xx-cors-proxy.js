// Cloudflare Worker — CORS proxy for 18xx.games API
// Deploy: npx wrangler deploy worker/18xx-cors-proxy.js --name 18xx-cors-proxy
//
// Usage: https://18xx-cors-proxy.<your-subdomain>.workers.dev/api/game/12345

const ALLOWED_ORIGIN = '*' // lock down to your GitHub Pages URL if desired
const UPSTREAM = 'https://18xx.games'

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)

    // Only proxy /api/* paths
    if (!url.pathname.startsWith('/api/')) {
      return new Response('Not found', { status: 404 })
    }

    const upstream = `${UPSTREAM}${url.pathname}${url.search}`
    const resp = await fetch(upstream, {
      method: request.method,
      headers: { 'User-Agent': '18xxBroker-proxy' },
    })

    // Clone response and add CORS headers
    const body = await resp.arrayBuffer()
    return new Response(body, {
      status: resp.status,
      headers: {
        ...Object.fromEntries(resp.headers),
        ...corsHeaders(request),
      },
    })
  },
}

function corsHeaders(_request) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}
