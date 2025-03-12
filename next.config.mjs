/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip specific paths during build that might cause issues
  experimental: {
    outputFileTracingExcludes: {
      "*": ["./app/api/auth/**/*"],
    },
  },
  // If your app uses older React features, you might need this
  reactStrictMode: false,
};

export default nextConfig;
