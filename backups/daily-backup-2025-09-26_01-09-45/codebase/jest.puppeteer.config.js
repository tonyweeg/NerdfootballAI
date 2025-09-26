module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/__tests__/**/*.test.js', '**/tests/**/*.test.js'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironmentOptions: {
    defaultViewport: {
      width: 1280,
      height: 720
    },
    timeout: 30000
  }
};