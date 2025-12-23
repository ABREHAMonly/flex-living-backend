// jest.config.js (updated)
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/app.ts',
    '!src/**/index.ts',
    '!src/tests/**/*.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
coverageThreshold: {
  global: {
    branches: 41,    // Current is 40.44%
    functions: 49,   // Current is 48.32%
    lines: 50,       // Already met
    statements: 50   // Already met
  }
},
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  testTimeout: 30000,
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ]
};