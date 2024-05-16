const { GemeenteNijmegenCdkApp } = require('@gemeentenijmegen/projen-project-type');

const project = new GemeenteNijmegenCdkApp({
  cdkVersion: '2.45.0',
  defaultReleaseBranch: 'main',
  name: 'tribe-brp-linker',
  deps: [
    'dotenv',
    'cdk-remote-stack',
    '@gemeentenijmegen/aws-constructs',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-secrets-manager',
    '@aws-sdk/client-ssm',
    '@gemeentenijmegen/apiclient',
    '@gemeentenijmegen/apigateway-http',
    '@gemeentenijmegen/session',
    '@gemeentenijmegen/utils',
    '@types/aws-lambda',
    'axios',
    'cookie',
    'mustache',
    'openid-client',
  ],
  devDeps: [
    '@gemeentenijmegen/projen-project-type',
    '@types/mustache',
    '@types/cookie',
    '@aws-sdk/types',
    'aws-sdk-client-mock',
    'axios-mock-adapter',
    'dotenv',
    '@glen/jest-raw-loader',
  ],
  jestOptions: {
    jestConfig: {
      setupFiles: ['dotenv/config'],
      testPathIgnorePatterns: ['/node_modules/', '/cdk.out', '/test/playwright'],
      roots: ['src', 'test'],
      transform: {
        '\\.[jt]sx?$': 'ts-jest',
        '^.+\\.mustache$': '@glen/jest-raw-loader',
      },
      moduleFileExtensions: [
        'js', 'json', 'jsx', 'ts', 'tsx', 'node', 'mustache',
      ],
    },
  },
  bundlerOptions: {
    loaders: {
      mustache: 'text',
    },
  },
  eslintOptions: {
    devdirs: ['src/**/tests', '/test', '/build-tools'],
  },
  gitignore: [
    'src/app/**/tests/output',
    'local',
  ],
});
project.synth();
