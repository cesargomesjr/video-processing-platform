/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/main/bootstrap.ts',
    '!apps/api/src/main/app.module.ts',
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  roots: ['<rootDir>/apps/api/src', '<rootDir>/apps/api/test'],
  testEnvironment: 'node',
  testRegex: '.*\\.(e2e-)?spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: 'apps/api/tsconfig.json', useESM: true },
    ],
  },
};
