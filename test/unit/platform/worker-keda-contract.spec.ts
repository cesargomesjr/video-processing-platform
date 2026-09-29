import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseAllDocuments } from 'yaml';
import { z } from 'zod';

import { VIDEO_PROCESSING_QUEUES } from '../../../src/platform/messaging/video-processing-topology';

const workerScaledObjectSchema = z.object({
  kind: z.literal('ScaledObject'),
  metadata: z.object({ name: z.literal('worker') }),
  spec: z.object({
    triggers: z.array(
      z.object({
        type: z.string(),
        metadata: z.object({
          protocol: z.string(),
          mode: z.string(),
          queueName: z.string(),
          useRegex: z.string(),
          operation: z.string(),
        }),
      }),
    ),
  }),
});

describe('worker KEDA queue contract', () => {
  it('watches every work queue but not retry or dead-letter queues', () => {
    const manifest = readFileSync(
      resolve(__dirname, '../../../infra/k8s/worker-keda.yaml'),
      'utf8',
    );
    const resources: unknown[] = parseAllDocuments(manifest).map(
      (document): unknown => document.toJS() as unknown,
    );
    const workerResource = resources.find(
      (resource) => workerScaledObjectSchema.safeParse(resource).success,
    );
    const worker = workerScaledObjectSchema.parse(workerResource);
    const rabbitMqTriggers = worker.spec.triggers.filter((trigger) => trigger.type === 'rabbitmq');

    expect(rabbitMqTriggers).toHaveLength(1);
    const trigger = rabbitMqTriggers[0];
    if (trigger === undefined) {
      throw new Error('Worker RabbitMQ trigger is missing');
    }
    expect(trigger.metadata).toMatchObject({
      protocol: 'http',
      mode: 'QueueLength',
      useRegex: 'true',
      operation: 'sum',
    });

    const selectedQueues = new RegExp(trigger.metadata.queueName);
    for (const { queue } of VIDEO_PROCESSING_QUEUES) {
      expect(selectedQueues.test(queue)).toBe(true);
      expect(selectedQueues.test(`${queue}.retry`)).toBe(false);
      expect(selectedQueues.test(`${queue}.dlq`)).toBe(false);
    }
    expect(selectedQueues.test('video.unconfigured.worker')).toBe(false);
  });
});
