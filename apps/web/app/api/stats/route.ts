import { Job } from '@jobflow/core';
import Redis from 'ioredis';
import { NextResponse } from 'next/server';

// Prevents caching
export const dynamic = 'force-dynamic';

export async function GET() {
    const redis = new Redis({ host: 'localhost', port: 6379 });
    const prefix = 'jobflow:email';

    try {
        const [waitCount, activeCount, completedCount, failedCount, delayedCount] = await Promise.all([
            redis.llen(`${prefix}:wait`),
            redis.llen(`${prefix}:active`),
            redis.llen(`${prefix}:completed`),
            redis.llen(`${prefix}:failed`),
            redis.zcard(`${prefix}:delayed`),
        ]);

        // Fetch recent completed jobs
        const completedIds = await redis.lrange(`${prefix}:completed`, 0, 9);
        const jobs: Job[] = [];

        for (const id of completedIds) {
            const data = await redis.get(`${prefix}:job:${id}`);
            if (data) jobs.push(JSON.parse(data));
        }

        return NextResponse.json({
            counts: { waitCount, activeCount, completedCount, failedCount, delayedCount },
            jobs
        });
    } catch (error) {
        return NextResponse.json({ error: 'Redis Connection Failed' }, { status: 500 });
    } finally {
        await redis.quit();
    }
}
