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
        pathname: '/**', // Permitir qualquer caminho para garantir que funcione
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Adicionando domínio do Google Auth
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com', // Permitir example.com (pode ser usado em dados de teste)
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'engaaja.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.engaaja.com.br',
        port: '',
        pathname: '/**',
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
