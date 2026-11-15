module.exports = {
  displayName: 'game',
  rootDir: '../..',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/projects/game/tests/**/*.test.jsx'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' }
}
