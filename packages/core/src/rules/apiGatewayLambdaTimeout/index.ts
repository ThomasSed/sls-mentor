import { GetIntegrationCommand } from '@aws-sdk/client-api-gateway';
import {
  fetchAllRestApiGatewayResources,
  fetchLambdaConfigurationByArn,
} from '../../aws-sdk-helpers';
import { apiGatewayClient } from '../../clients';
import { CustomARN, LambdaFunctionARN, Rule } from '../../types';

const run: Rule['run'] = async resourceArns => {
  await Promise.resolve(resourceArns); // Delete this line

  const restApiGatewaysResources = await fetchAllRestApiGatewayResources(
    resourceArns,
  );

  return {
    results: {
      ...restApiGatewaysResources.map(async restApiGatewayResource => {
        const result = await apiGatewayClient.send(
          new GetIntegrationCommand({
            resourceId: restApiGatewayResource.resources[0].id,
            restApiId: restApiGatewayResource.arn.getApiId(),
            httpMethod: Object.keys(
              restApiGatewayResource.resources[0].resourceMethods ?? {},
            )[0],
          }),
        );
        const lambdaARN = (result.uri ?? '')
          .split('/functions/')[1]
          .split('/invocations')[0];
        console.log(lambdaARN);
        const a = CustomARN.fromArnString(lambdaARN);

        if (a.service !== 'lambda') {
          return;
        }

        // faire un isEqual entre
        const lambdaConfiguration = await fetchLambdaConfigurationByArn(
          new LambdaFunctionARN(a.resource),
        );
        const timeout = lambdaConfiguration.configuration.Timeout;
        const isValid = (timeout ?? 0) * 1000 <= (result.timeoutInMillis ?? 0);

        return {
          arn: a,
          success: isValid,
        };
      }),
    },
  };
};

export const apiGatewayLambdaTimeout: Rule = {
  ruleName: '<Displayed rule name>',
  errorMessage: '<Displayed error message>',
  run,
  fileName: 'apiGatewayLambdaTimeout', // Do not change
  categories: ['GreenIT'], // Set categories related to rule
  level: 3, // Set level related to rule
  service: 'Lambda', // Set service related to rule
  easyToFix: false, // is it easy to fix non-complying resources?
  severity: 'medium', // what are the impacts of the problem solved by the rule?
};
