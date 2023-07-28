import { Construct } from 'constructs';
import { apiGatewayLambdaTimeout as ApiGatewayLambdaTimeoutRule } from './index';

interface ApiGatewayLambdaTimeoutProps {
  myProp: string;
}

export class ApiGatewayLambdaTimeout extends Construct {
  static passTestCases: Record<string, ApiGatewayLambdaTimeoutProps> = {
    'One successful test case': { myProp: 'value1' },
    'Another successful test case': { myProp: 'value2' },
  };

  static failTestCases: Record<string, ApiGatewayLambdaTimeoutProps> = {
    'One failing test case': { myProp: 'value3' },
  };

  constructor(scope: Construct, id: string, { myProp }: ApiGatewayLambdaTimeoutProps) {
    super(scope, id);
    // const construct = new DefaultConstruct(this, 'DefaultConstruct', {
    //   cdkProp: myProp,
    // });
    // construct.tagRule(ApiGatewayLambdaTimeoutRule);
  }
}    
