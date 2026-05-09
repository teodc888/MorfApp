/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,

  async headers() {
    return [
      {
        // Cache de los frames PNG por 1 año (son inmutables)
        source: '/secuencia/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache de modelos 3D y texturas por 1 año
        source: '/models/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache de imágenes estáticas por 30 días
        source: '/(.*)\\.(?:jpg|jpeg|png|gif|webp|avif|svg|ico)$',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        // Cache de fuentes por 1 año
        source: '/(.*)\\.(?:woff|woff2|ttf|eot)$',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,
  },
};

module.exports = nextConfig;
