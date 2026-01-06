# JobFlow

JobFlow is a robust, distributed task orchestration system designed to handle high-throughput background processing with reliability and real-time observability. It implements a producer-consumer architecture using Redis for state management and atomic locking mechanisms.

## System Architecture

The system is built as a monorepo with the following components:

- **`@jobflow/core`**: The shared library containing the core `JobQueue` (Producer) and `Worker` (Consumer) logic. It manages Redis connections, implements atomic operations using `BRPOPLPUSH` for reliability, and defines shared types.
- **`apps/api`**: An Express.js REST API that acts as the entry point for job submission. It handles request validation and enqueues jobs into Redis.
- **`apps/worker`**: A standalone Node.js worker process that claims jobs from the queue, executes them (with simulated processing delays and failure modes), and updates job status.
- **`apps/web`**: A Next.js-based real-time dashboard for monitoring queue health, job rates, and recent completions.

## Prerequisites

- **Node.js**: v18 or higher
- **pnpm**: v8 or higher
- **Redis**: v6 or higher (running locally on port 6379)

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd jobflow
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Start Redis (if not already running):
    ```bash
    docker run -d -p 6379:6379 redis
    ```

## Running the System

Start all services (API, Worker, Dashboard) in parallel:

```bash
pnpm dev
```

- **API Server**: `http://localhost:4000`
- **Dashboard**: `http://localhost:3000` (or 3001 if 3000 is taken)

## API Reference

### Submit a Job

**Endpoint**: `POST http://localhost:4000/jobs`

**Body**:
```json
{
  "name": "email-delivery",
  "data": {
    "to": "user@example.com",
    "template": "welcome"
  }
}
```

**Response**:
```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-...",
    "status": "waiting",
    "timestamp": 1704542000000
  }
}
```

## Dashboard Features

The dashboard provides a real-time view of the system's state:
- **Queue Metrics**: Instant counts for Waiting, Active, Completed, and Failed jobs.
- **Recent Activity**: A live feed of recently completed jobs with their processing metadata.
- **Health Status**: Visual indicators of system throughput.

## Development

- **Build all packages**: `pnpm build`
- **Lint code**: `pnpm lint`
