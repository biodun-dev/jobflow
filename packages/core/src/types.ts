export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'waiting-parent';

export interface JobOptions {
    maxAttempts?: number;
    backoff?: {
        type: 'fixed' | 'exponential';
        delay: number;
    };
    parent?: string; // ID of the parent job
}

export interface Job<T = any> {
    id: string;
    name: string;
    data: T;
    status: JobStatus;
    timestamp: number;
    processedOn?: number;
    finishedOn?: number;
    failedReason?: string;
    attemptsMade: number;
    opts?: JobOptions;
}

export interface QueueOptions {
    connection: {
        host: string;
        port: number;
    };
    prefix?: string;
}
