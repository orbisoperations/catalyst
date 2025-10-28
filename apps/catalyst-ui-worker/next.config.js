/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

// Initialize Cloudflare for development
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withBundleAnalyzer(nextConfig);
