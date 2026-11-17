module.exports = {
  displayName: 'game',
  rootDir: '../..',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/projects/game/tests/**/*.test.jsx'],
  transform: { '^.+\\.m?[jt]sx?$': 'babel-jest' }
}
