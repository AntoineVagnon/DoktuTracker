/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ES2022',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        allowJs: true,
        resolveJsonModule: true
      }
    }],
    '^.+\\.(js|jsx)$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
      tsconfig: {
        allowJs: true,
        module: 'ES2022',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }]
  },
  moduleNameMapper: {
    // Handle TypeScript extensions for imports (.js imports that reference .ts files)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    
    // Handle project aliases
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.ts'
  ],
  collectCoverage: false,
  setupFilesAfterEnv: [],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Handle dynamic imports and ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|uuid|@jest/globals|date-fns|drizzle-orm|drizzle-zod|supertest|express)/)'
  ],
  // Add verbose output for debugging
  verbose: true
};

export default config;