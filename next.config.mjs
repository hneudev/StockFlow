/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Evita que webpack duplique mongoose en bundles separados.
    // Sin esto, el Server Component y las API Routes tienen instancias
    // distintas de mongoose: el SC conecta la suya pero las rutas arrancan
    // sin conexión en cold start, causando 500s en el primer render.
    serverComponentsExternalPackages: ["mongoose"],
  },
};

export default nextConfig;
