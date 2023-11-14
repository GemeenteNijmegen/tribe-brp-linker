import { App } from 'aws-cdk-lib';
import { PipelineStack } from './PipelineStack';

// for development, use sandbox account
const deploymentEnvironmentNewLZ = {
  account: '836443378780',
  region: 'eu-central-1',
};

const developmentEnvironment = {
  account: '471236387053',
  region: 'eu-central-1',
};

const acceptanceEnvironmentNewLz = {
  account: '987304085258',
  region: 'eu-central-1',
};

const productionEnvironmentNewLz = {
  account: '962664892091',
  region: 'eu-central-1',
};

const app = new App();


if ('BRANCH_NAME' in process.env == false || process.env.BRANCH_NAME == 'development') {
  new PipelineStack(app, 'tribebrp-pipeline-development',
    {
      env: deploymentEnvironmentNewLZ,
      branchName: 'development',
      deployToEnvironment: developmentEnvironment,
    },
  );
} else if (process.env.BRANCH_NAME == 'acceptance-new-lz' || process.env.BRANCH_NAME == 'acceptance') {
  new PipelineStack(app, 'tribebrp-pipeline-acceptance',
    {
      env: deploymentEnvironmentNewLZ,
      branchName: 'acceptance',
      deployToEnvironment: acceptanceEnvironmentNewLz,
    },
  );
} else if (process.env.BRANCH_NAME == 'main-new-lz' || process.env.BRANCH_NAME == 'main') {
  new PipelineStack(app, 'tribebrp-pipeline-production',
    {
      env: deploymentEnvironmentNewLZ,
      branchName: 'main',
      deployToEnvironment: productionEnvironmentNewLz,
    },
  );
}

app.synth();
