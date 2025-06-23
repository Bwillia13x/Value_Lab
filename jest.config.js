/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  collectCoverage: true,
  collectCoverageFrom: ['src/utils/performance.ts'],
  coverageThreshold: {
    'src/utils/performance.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};