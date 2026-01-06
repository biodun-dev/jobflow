import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobOptions, QueueOptions } from './types';

export class JobQueue {
    private redis: Redis;
    private prefix: string;

    constructor(private queueName: string, options: QueueOptions) {
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

    private getDependencyKey(jobId: string): string {
        return `${this.prefix}:${this.queueName}:dependencies:${jobId}`;
    }

    async add<T>(name: string, data: T, opts?: JobOptions): Promise<Job<T>> {
        const jobId = uuidv4();
        const job: Job<T> = {
            id: jobId,
            name,
            data,
            status: 'waiting',
            timestamp: Date.now(),
            attemptsMade: 0,
            opts: opts || {},
        };

        const pipeline = this.redis.pipeline();
        let shouldAddToWait = true;

        if (opts?.parent) {
            // Check parent status
            const parentKey = this.getJobKey(opts.parent);
            const parentData = await this.redis.get(parentKey);

            if (parentData) {
                const parentJob: Job = JSON.parse(parentData);
                if (parentJob.status !== 'completed') {
                    // Parent not ready, wait for it
                    job.status = 'waiting-parent';
                    shouldAddToWait = false;
                    pipeline.sadd(this.getDependencyKey(opts.parent), jobId);
                    console.log(`Job ${jobId} waiting for parent ${opts.parent}`);
                }
            } else {
                console.warn(`Parent job ${opts.parent} not found. processing as normal.`);
            }
        }

        // 1. Store the job data
        pipeline.set(this.getJobKey(jobId), JSON.stringify(job));

        // 2. Add to the wait list (FIFO queue) if ready
        if (shouldAddToWait) {
            pipeline.lpush(this.getKey('wait'), jobId);
        }

        await pipeline.exec();

        return job;
    }

    async close() {
        await this.redis.quit();
    }
}
