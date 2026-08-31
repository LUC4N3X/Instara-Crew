import { Queue } from "bullmq";
import { redis } from "./redis";

export const prepQueue = new Queue("instara-crew.prep", {
  connection: redis,
});

export const postQueue = new Queue("instara-crew.post", {
  connection: redis,
});

export async function enqueuePreparation(jobId: string) {
  return prepQueue.add(
    "prepare-job",
    { jobId },
    {
      jobId: `prepare:${jobId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 1500 },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

export async function enqueuePublication(jobId: string, runId: string, burst = false) {
  return postQueue.add(
    "publish-job",
    { jobId, runId, burst },
    {
      jobId: `publish:${jobId}:${runId}`,
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}
