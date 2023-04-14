import {
  GetQueueAttributesCommand,
  GetQueueAttributesCommandOutput,
} from '@aws-sdk/client-sqs';
import { sqsCLient } from 'clients';
import { CustomARN, SqsQueueARN } from 'types';

type QueueAttributes = {
  arn: SqsQueueARN;
  attributes: GetQueueAttributesCommandOutput;
};
export const fetchQueueAttributesByArn = async (
  arn: SqsQueueARN,
): Promise<QueueAttributes> => {
  return {
    arn: arn,
    attributes: await sqsCLient.send(
      new GetQueueAttributesCommand({
        QueueUrl: arn.resource,
        AttributeNames: ['RedrivePolicy'],
      }),
    ),
  };
};

export const fetchAllQueuesAttributes = async (
  resourceArns: CustomARN[],
): Promise<QueueAttributes[]> => {
  const queues = CustomARN.filterArns(resourceArns, SqsQueueARN);

  const AttributesByArn = await Promise.all(
    queues.map(arn => fetchQueueAttributesByArn(arn)),
  );

  return AttributesByArn;
};
