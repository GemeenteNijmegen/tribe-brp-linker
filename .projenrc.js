const { GemeenteNijmegenCdkApp } = require('@gemeentenijmegen/modules-projen');
const project = new GemeenteNijmegenCdkApp({
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  devDeps: ['@gemeentenijmegen/modules-projen'],
  name: 'tribe-brp-linker',

  deps: [
    'dotenv',
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
    'cdk-remote-stack',
  ],
  jestOptions: {
    jestConfig: {
      setupFiles: ['dotenv/config'],
      testPathIgnorePatterns: ['/node_modules/', '/cdk.out', '/test/playwright'],
      roots: ['src', 'test'],
    },
  },
  scripts: {
    'install:login': 'cd src/app/login && npm install',
    'install:auth': 'cd src/app/auth && npm install',
    'install:home': 'cd src/app/home && npm install',
    'install:logout': 'cd src/app/logout && npm install',
    'postinstall': 'npm run install:login && npm run install:auth && npm run install:home && npm run install:logout',
    'post-upgrade': ' \
      (cd src/app/login && npx npm-check-updates -u --dep prod,dev && npm install) \
      && (cd src/app/home && npx npm-check-updates -u --dep prod,dev && npm install) \
      && (cd src/app/login && npx npm-check-updates -u --dep prod,dev && npm install) \
      && (cd src/app/logout && npx npm-check-updates -u --dep prod,dev && npm install)',
  },
  eslintOptions: {
    devdirs: ['src/app/login/tests', 'src/app/auth/tests', 'src/app/home/tests', 'src/app/uitkeringen/tests', 'src/app/logout/tests', '/test', '/build-tools'],
  },
  gitignore: [
    'src/app/**/tests/output',
  ],
});
project.synth();