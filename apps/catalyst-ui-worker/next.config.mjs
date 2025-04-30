// note: the if statement is present because you
//       only need to use the function during development
if (process.env.NODE_ENV === 'development') {

}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Add this to disable built-in ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
