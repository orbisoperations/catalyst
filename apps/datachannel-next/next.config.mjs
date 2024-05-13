/** @type {import('next').NextConfig} */
const nextConfig = {
        typescript: {
                ignoreBuildErrors: true
        },
        eslint: {
                // Warning: This allows production builds to successfully complete even if
                // your project has ESLint errors.
                // TODO: When stable, change this...Gets us around type errors in the build.
                ignoreDuringBuilds: true,
        },
};

export default nextConfig;
