const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** Supabase-backed tests; requires env and DB access. */
module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts', '**/*.integration.test.tsx'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
});
