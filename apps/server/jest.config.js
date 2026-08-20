/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@dayangyunjie/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^@prisma/client$': '<rootDir>/../../../node_modules/@prisma/client/default.js',
  },
  moduleDirectories: ['node_modules', '<rootDir>/../../../node_modules'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/main.ts'],
};
