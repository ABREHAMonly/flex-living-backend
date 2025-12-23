module.exports = {
  reporter: 'jest-junit',
  outputDirectory: '.',
  outputName: 'junit.xml',
  classNameTemplate: '{classname}',
  titleTemplate: '{title}',
  ancestorSeparator: ' › ',
  usePathForSuiteName: true
};