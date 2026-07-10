/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@heroui/react'],
  devIndicators: false,
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
