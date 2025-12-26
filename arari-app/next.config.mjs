/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow cross-origin requests from local network during development
  allowedDevOrigins: [
    'http://192.168.1.40:3000',
    'http://192.168.1.40:3877',
    'http://192.168.1.*:*',
  ],

  /**
   * Configuration for 粗利 PRO
   *
   * DEPLOYMENT MODE: Client-Side SPA with SSR disabled
   *
   * Notes:
   * - Uses Next.js as a development framework but deploys as static files
   * - All data fetching happens client-side via TanStack Query
   * - Backend API runs separately on FastAPI (port 8000)
   * - Pages use 'use client' directive for interactivity
   *
   * Why NOT using 'output: export':
   * - Dynamic routes like /employees/[id]/wage-ledger require SSR capabilities
   * - 'use client' pages with dynamic params don't work well with static export
   * - We still get a client-side SPA behavior, just with better routing support
   *
   * For static deployment, run: npm run build && npm run start
   */

  trailingSlash: true,
}

export default nextConfig
