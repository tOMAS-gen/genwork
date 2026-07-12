import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: {
    position: "bottom-right",
  },
  eslint: {
    // El setup de ESLint (@rushstack/eslint-patch) es incompatible con ESLint 9
    // y crashea durante `next build`; el lint se corre aparte con `npm run lint`.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
