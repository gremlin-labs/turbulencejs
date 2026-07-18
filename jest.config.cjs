module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '^turbulencejs$': '<rootDir>/src/index.js'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
