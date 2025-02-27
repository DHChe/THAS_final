module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: [
      '<rootDir>/src/setupTests.js',
      'jest-fetch-mock/setupJest'
    ],
    moduleNameMapper: {
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    transform: {
      '^.+\\.(js|jsx)$': 'babel-jest',
    },
    testMatch: [
      '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
      '<rootDir>/src/**/*.{spec,test}.{js,jsx}'
    ],
    moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  };