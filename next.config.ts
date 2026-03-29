import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

/** Directory of this Next app (`public/`, `src/`). Required when a parent folder has another lockfile — otherwise Next picks the monorepo root and dev breaks (wrong `public/`, CSS, assets). */
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: packageDir,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
  },
  /** Enable server components to use Node.js APIs in API routes */
  serverExternalPackages: ['fs', 'path', 'os'],
};

export default nextConfig;
