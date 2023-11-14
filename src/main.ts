import { App } from 'aws-cdk-lib';
import { PipelineStack } from './PipelineStack';

const deploymentEnvironment = {
  account: '836443378780',
  region: 'eu-central-1',
};

const developmentEnvironment = {
  account: '471236387053',
  region: 'eu-central-1',
};

const acceptanceEnvironment = {
  account: '987304085258',
  region: 'eu-central-1',
};

const productionEnvironment = {
  account: '962664892091',
  region: 'eu-central-1',
};

const app = new App();


if ('BRANCH_NAME' in process.env == false || process.env.BRANCH_NAME == 'development') {
  new PipelineStack(app, 'tribebrp-pipeline-development',
    {
      env: deploymentEnvironment,
      branchName: 'development',
      deployToEnvironment: developmentEnvironment,
    },
  );
} else if (process.env.BRANCH_NAME == 'acceptance') {
  new PipelineStack(app, 'tribebrp-pipeline-acceptance',
    {
      env: deploymentEnvironment,
      branchName: 'acceptance',
      deployToEnvironment: acceptanceEnvironment,
    },
  );
} else if (process.env.BRANCH_NAME == 'main') {
  new PipelineStack(app, 'tribebrp-pipeline-production',
    {
      env: deploymentEnvironment,
      branchName: 'main',
      deployToEnvironment: productionEnvironment,
    },
  );
}

app.synth();
