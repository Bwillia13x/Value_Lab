import { pathsToModuleNameMapper } from 'ts-jest';
import tsconfig from './tsconfig.json' assert { type: 'json' };

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: './tsconfig.json',
    },
  },
  moduleNameMapper: pathsToModuleNameMapper(
    tsconfig.compilerOptions.paths || {},
    { prefix: '<rootDir>/' },
  ),
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};