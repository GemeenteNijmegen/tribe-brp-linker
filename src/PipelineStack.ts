import { Stack, StackProps, Tags, pipelines, CfnParameter, Environment, Aspects } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiStage } from './ApiStage';
import { ParameterStage } from './ParameterStage';
import { Statics } from './statics';
import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';

export interface PipelineStackProps extends StackProps{
  branchName: string;
  deployToEnvironment: Environment;
}

export class PipelineStack extends Stack {
  branchName: string;
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);
    Aspects.of(this).add(new PermissionsBoundaryAspect());
    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);
    this.branchName = props.branchName;

    const connectionArn = new CfnParameter(this, 'connectionArn');
    const source = this.connectionSource(connectionArn);

    const pipeline = this.pipeline(source);
    pipeline.addStage(new ParameterStage(this, 'parameters', { env: props.deployToEnvironment }));
    pipeline.addStage(new ApiStage(this, 'tribebrp', { env: props.deployToEnvironment, branch: this.branchName }));

  }


  pipeline(source: pipelines.CodePipelineSource): pipelines.CodePipeline {
    const synthStep = new pipelines.ShellStep('Synth', {
      input: source,
      env: {
        BRANCH_NAME: this.branchName,
      },
      commands: [
        'yarn install --frozen-lockfile',
        'npx projen build',
        'npx projen synth',
      ],
    });

    const pipeline = new pipelines.CodePipeline(this, `tribebrp-${this.branchName}`, {
      pipelineName: `tribebrp-${this.branchName}`,
      crossAccountKeys: true,
      synth: synthStep,
    });
    return pipeline;
  }

  private connectionSource(connectionArn: CfnParameter): pipelines.CodePipelineSource {
    return pipelines.CodePipelineSource.connection(`${Statics.repositoryOwner}/${Statics.repository}`, this.branchName, {
      connectionArn: connectionArn.valueAsString,
    });
  }
}
