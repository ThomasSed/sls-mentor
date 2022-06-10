#!/usr/bin/env node
import { Command, InvalidArgumentError, program } from 'commander';

import { runGuardianChecks } from './index';
import { Rule } from './types/Rule';

export type Tag = {
  key: string;
  value: string;
};

const hasKeyAndValue = (
  groups: Record<string, string> | undefined,
): groups is Tag => {
  // ts-config is loosely assuming all keys exist, type guard to be updated when Typescript config is updated
  return groups !== undefined;
};

const parseTags = (
  tagOption: string,
  previousTags: Tag[] | undefined,
): Tag[] => {
  const [{ groups: tag }] = [
    ...tagOption.matchAll(
      /^Key=(?<key>[\p{L}\p{Z}\p{N}_.:/=+\-@]*),Value=(?<value>[\p{L}\p{Z}\p{N}_.:/=+\-@]*)$/gu,
    ),
  ];
  if (!hasKeyAndValue(tag)) {
    throw new InvalidArgumentError('Invalid flag parameters');
  }

  if (!previousTags) {
    return [tag];
  }

  return [...previousTags, tag];
};

export const handleGuardianChecksCommand = async (
  options: Options,
): Promise<void> => {
  console.log('Running checks');
  const results = await runGuardianChecks(options);
  console.log('Checks summary: ');

  let atLeastOneFailed = false;
  results.forEach(({ rule, result }) => {
    const successCount = result.filter(e => e.success).length;
    const failCount = result.length - successCount;

    atLeastOneFailed = atLeastOneFailed || failCount > 0;
    const successRatio = successCount / (failCount + successCount);
    const failRatio = failCount / (failCount + successCount);
    console.log(
      successRatio < 0.7
        ? '\x1b[31m'
        : successRatio < 1
        ? '\x1b[33m'
        : '\x1b[32m',
      `${rule.ruleName}:\n`,
      `[${'◼'.repeat(Math.floor(20 * successRatio))}${' '.repeat(
        Math.floor(20 * failRatio),
      )}] ${successRatio * 100}%`,
      '\x1b[0m\n',
    );
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (options.short || !atLeastOneFailed)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    process.exit(atLeastOneFailed ? 1 : 0);

  console.log('\nFailed checks details: ');
  const failedByResource: Record<string, { rule: Rule; extras: string[][] }[]> =
    {};

  results.forEach(({ rule, result }) => {
    result
      .filter(e => !e.success)
      .forEach(resourceResult => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (failedByResource[resourceResult.arn] === undefined)
          failedByResource[resourceResult.arn] = [];
        const extraArgs = Object.keys(resourceResult)
          .filter(k => !['arn', 'success'].includes(k))
          .map(k => [k, resourceResult[k] as string]);
        failedByResource[resourceResult.arn].push({
          rule,
          extras: extraArgs,
        });
      });
  });

  Object.keys(failedByResource).forEach(resourceArn => {
    console.error(
      '\n\x1b[47m\x1b[31m',
      `Failed checks on resource "${resourceArn}" :`,
      '\x1b[0m\n',
    );
    failedByResource[resourceArn].forEach(failedCheck => {
      console.log(
        '\x1b[31m',
        `   - ${failedCheck.rule.ruleName}: ${failedCheck.rule.errorMessage}`,
        failedCheck.extras.length > 0
          ? `(${failedCheck.extras.map(e => `${e[0]}: ${e[1]}`).join(', ')})`
          : '',
        '\x1b[0m\n',
      );
    });
    //console.table(failedByResource[resourceArn]);
  });
};

export type Options = {
  awsProfile?: string;
  awsRegion?: string;
  short: boolean;
  tags?: Tag[];
  cloudformation?: string;
};

const setAwsProfile = (command: Command): void => {
  const awsProfile = command.opts<Options>().awsProfile;
  if (awsProfile !== undefined) {
    process.env.AWS_PROFILE = awsProfile;
  }
};

const setAwsRegion = (command: Command): void => {
  const awsRegion = command.opts<Options>().awsRegion;
  if (awsRegion !== undefined) {
    process.env.AWS_REGION = awsRegion;
  }
};

program
  .name('guardian')
  .version(process.env.npm_package_version ?? '0.0.0')
  .option('-s, --short', 'Short output', false)
  .option('-p, --aws-profile <profile>', 'AWS profile to use')
  .option('-r, --aws-region <region>', 'Specify region')
  .option('-t, --tags <key_value...>', 'Add filter tags', parseTags)
  .option(
    '-c, --cloudformation <cloudformation_stack_name>',
    'Only check resources from the specified CloudFormation stack name',
  )
  .action(handleGuardianChecksCommand)
  .hook('preAction', setAwsProfile)
  .hook('preAction', setAwsRegion)
  .parse();
