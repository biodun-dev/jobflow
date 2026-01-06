import { Job, Worker } from '@jobflow/core';

const queueName = 'email';

const processEmail = async (job: Job) => {
    console.log(`[Worker ${process.pid}] Processing job ${job.id}:`, job.data);

    // Simulate processing time (1-5 seconds)
    const delay = Math.floor(Math.random() * 4000) + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    if (job.name === 'fail-test') {
        throw new Error('Planned Deterministic Failure');
    }

    // Simulate random failure (10% chance)
    if (Math.random() < 0.1) {
        throw new Error('Random SMTP Failure');
    }

    console.log(`[Worker ${process.pid}] Finished job ${job.id}`);
};

const worker = new Worker(queueName, processEmail, {
    connection: { host: 'localhost', port: 6379 }
});

console.log(`[Worker ${process.pid}] Started listening to '${queueName}' queue...`);
worker.start();
