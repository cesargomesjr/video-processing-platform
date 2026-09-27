/** @type {import('jest').Config} */
const transform = {
  '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
};

/** @type {import('jest').Config} */
module.exports = {
  passWithNoTests: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '<rootDir>/apps/api/src/**/*.ts',
    '<rootDir>/apps/worker/src/**/*.ts',
    '!<rootDir>/**/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  projects: [
    {
      displayName: 'unit',
      rootDir: '.',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      transform,
      moduleFileExtensions: ['js', 'json', 'ts'],
    },
    {
      displayName: 'integration',
      rootDir: '.',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      transform,
      moduleFileExtensions: ['js', 'json', 'ts'],
    },
    {
      displayName: 'e2e',
      rootDir: '.',
      testMatch: ['<rootDir>/test/e2e/**/*.spec.ts'],
      transform,
      moduleFileExtensions: ['js', 'json', 'ts'],
    },
  ],
};
