const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  /** Real DB / env; run with `yarn test:integration` */
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.test\\.tsx?$',
  ],
  collectCoverageFrom: [
    'src/lib/middlewareRuntime.ts',
    'src/app/api/[projectSlug]/[...path]/route.ts',
  ],
};

module.exports = createJestConfig(config);
