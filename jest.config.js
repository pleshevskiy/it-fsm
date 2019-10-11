module.exports = {
    testRegex: 'tests/.*\\.spec\\.ts',
    testEnvironment: 'node',
    preset: 'ts-jest',
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
