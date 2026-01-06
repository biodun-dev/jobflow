import Redis from 'ioredis';
import { Job, QueueOptions } from './types';

export type Processor<T> = (job: Job<T>) => Promise<void>;

export class Worker {
    private redis: Redis;
    private prefix: string;
    private isRunning: boolean = false;

    constructor(
        private queueName: string,
        private processor: Processor<any>,
        options: QueueOptions
    ) {
        this.redis = new Redis({
            host: options.connection.host,
            port: options.connection.port,
        });
        this.prefix = options.prefix || 'jobflow';
    }

    private getKey(key: string): string {
        return `${this.prefix}:${this.queueName}:${key}`;
    }

    private getJobKey(jobId: string): string {
        return `${this.prefix}:${this.queueName}:job:${jobId}`;
    }

    async start() {
        this.isRunning = true;
        this.loop();
        this.schedulerLoop();
    }

    private async loop() {
        while (this.isRunning) {
            try {
                // Atomic move from wait -> active. Blocks until a job is available.
                // Returns the Job ID.
                const jobId = await this.redis.brpoplpush(
                    this.getKey('wait'),
                    this.getKey('active'),
                    0
                );

                if (jobId) {
                    await this.processJob(jobId);
                }
            } catch (error) {
                console.error('Worker Loop Error:', error);
                // Add a small delay if Redis is down to prevent tight error loops
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    private async schedulerLoop() {
        while (this.isRunning) {
            try {
                // Check for delayed jobs ready to be processed
                const now = Date.now();
                const delayedKey = this.getKey('delayed');

                // Get jobs with score <= now
                const jobIds = await this.redis.zrangebyscore(delayedKey, 0, now, 'LIMIT', 0, 10);

                for (const jobId of jobIds) {
                    // Atomic move: Try to remove from delayed. If successful, add to wait.
                    const removed = await this.redis.zrem(delayedKey, jobId);
                    if (removed > 0) {
                        await this.redis.lpush(this.getKey('wait'), jobId);
                        console.log(`Job ${jobId} moved from delayed to wait`);
                    }
                }
            } catch (error) {
                console.error('Scheduler Loop Error:', error);
            }
            // Sleep for 1 second
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    private async processJob(jobId: string) {
        // Fetch Job Data
        const jobKey = this.getJobKey(jobId);
        const rawJob = await this.redis.get(jobKey);

        if (!rawJob) {
            console.error(`Job ${jobId} not found in data store.`);
            // Should remove from active list? 
            return;
        }

        const job: Job = JSON.parse(rawJob);

        // Update Status to Active
        job.status = 'active';
        job.processedOn = Date.now();
        job.attemptsMade = (job.attemptsMade || 0) + 1; // Increment attempts
        await this.redis.set(jobKey, JSON.stringify(job)); // Checkpoint

        try {
            // Run User Function
            await this.processor(job);

            // Success
            await this.moveToCompleted(job);
        } catch (err: any) {
            // Check if we should retry
            if (job.opts?.maxAttempts && job.attemptsMade < job.opts.maxAttempts) {
                await this.moveToDelayed(job, err);
            } else {
                // Failure
                await this.moveToFailed(job, err);
            }
        }
    }

    private async moveToDelayed(job: Job, error: Error) {
        const pipeline = this.redis.pipeline();
        job.status = 'delayed';
        job.failedReason = error.message;

        // Calculate delay
        let delay = 1000;
        if (job.opts?.backoff) {
            if (job.opts.backoff.type === 'exponential') {
                delay = Math.pow(2, job.attemptsMade - 1) * job.opts.backoff.delay;
            } else {
                delay = job.opts.backoff.delay;
            }
        }

        const nextProcessTime = Date.now() + delay;

        pipeline.lrem(this.getKey('active'), 0, job.id); // Remove from active
        pipeline.zadd(this.getKey('delayed'), nextProcessTime, job.id); // Add to delayed ZSET
        pipeline.set(this.getJobKey(job.id), JSON.stringify(job)); // Update data

        await pipeline.exec();
        console.log(`Job ${job.id} delayed until ${new Date(nextProcessTime).toISOString()}. Reason: ${error.message}`);
    }

    private getDependencyKey(jobId: string): string {
        return `${this.prefix}:${this.queueName}:dependencies:${jobId}`;
    }

    private async moveToCompleted(job: Job) {
        const pipeline = this.redis.pipeline();
        job.status = 'completed';
        job.finishedOn = Date.now();

        pipeline.lrem(this.getKey('active'), 0, job.id); // Remove from active
        pipeline.lpush(this.getKey('completed'), job.id); // Add to completed
        pipeline.set(this.getJobKey(job.id), JSON.stringify(job)); // Update data

        // Check for dependents
        const dependencyKey = this.getDependencyKey(job.id);
        const dependents = await this.redis.smembers(dependencyKey);

        if (dependents.length > 0) {
            for (const childId of dependents) {
                const childKey = this.getJobKey(childId);
                const childData = await this.redis.get(childKey);

                if (childData) {
                    const childJob: Job = JSON.parse(childData);
                    childJob.status = 'waiting';
                    pipeline.set(childKey, JSON.stringify(childJob)); // Update child status
                    pipeline.lpush(this.getKey('wait'), childId); // Move child to wait queue
                    console.log(`Unlocking child job ${childId} as parent ${job.id} completed.`);
                }
            }
            pipeline.del(dependencyKey); // Clean up dependency record
        }

        await pipeline.exec();
        console.log(`Job ${job.id} completed.`);
    }

    private async moveToFailed(job: Job, error: Error) {
        const pipeline = this.redis.pipeline();
        job.status = 'failed';
        job.finishedOn = Date.now();
        job.failedReason = error.message;

        pipeline.lrem(this.getKey('active'), 0, job.id);
        pipeline.lpush(this.getKey('failed'), job.id);
        pipeline.set(this.getJobKey(job.id), JSON.stringify(job));

        await pipeline.exec();
        console.log(`Job ${job.id} failed.`);
    }

    async close() {
        this.isRunning = false;
        await this.redis.quit();
    }
}
