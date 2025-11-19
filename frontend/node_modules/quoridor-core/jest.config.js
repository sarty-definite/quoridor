/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest'],
  },
  // ignore compiled outputs so Jest doesn't try to parse dist files
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/dist/esm/', '<rootDir>/dist/cjs/', '/node_modules/'],
  transformIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/dist/esm/', '<rootDir>/dist/cjs/', '/node_modules/'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/src'],
};
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
};
