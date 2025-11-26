// Development code goes at the top
// eslint-disable-next-line no-undef
if (process.env.NODE_ENV === 'development') {
    await import('@opennextjs/cloudflare').then(({ initOpenNextCloudflareForDev }) => {
        initOpenNextCloudflareForDev();
    });
}

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    eslint: {
        // Disable the built-in ESLint during builds because we're using our own eslint config
        ignoreDuringBuilds: true,
        // Specify directories to run ESLint on during development
        dirs: ['app', 'components', 'layouts', 'theme', 'utils'],
    },
};

export default withBundleAnalyzer(nextConfig);
