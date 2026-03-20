import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // ─── SECURITY HEADERS (Military-Grade) ───
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        // Prevent clickjacking: no iframe embedding
        { key: 'X-Frame-Options', value: 'DENY' },
        // Prevent MIME-type sniffing
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // Force HTTPS for 1 year, including subdomains
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        // Block XSS in older browsers
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        // Don't leak referrer to external sites
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Restrict what the browser can load
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.coingecko.com https://finnhub.io https://www.goldapi.io https://nairobi-stock-exchange-nse.p.rapidapi.com https://commodities-api.com; frame-ancestors 'none';" },
        // Restrict browser features
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ],
    },
  ],
};

export default nextConfig;
