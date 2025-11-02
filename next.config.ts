import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Remover 'domains' para usar 'remotePatterns'
    // domains: ["www.gravatar.com", "firebasestorage.googleapis.com"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/poll-app1366.firebasestorage.app/o/**', // Corrigido para firebasestorage.app
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
