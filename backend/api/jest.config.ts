import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.spec.ts$',
  moduleNameMapper: {
    '^@matflow/backend-modules$': '<rootDir>/../modules/src/index.ts',
    '^@matflow/shared-types$': '<rootDir>/../../shared/types/src/index.ts',
    '^@matflow/shared-utils$': '<rootDir>/../../shared/utils/src/index.ts',
  },
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testEnvironment: 'node',
};

export default config;
