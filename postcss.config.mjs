import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pin app root so Tailwind content scanning does not use the parent repo cwd (avoids dev rebuild loops).
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    '@tailwindcss/postcss': {
      base: appRoot,
    },
  },
};

export default config;
