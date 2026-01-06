# JobFlow: Distributed Task Orchestration Engine

**JobFlow** is a high-performance, distributed task orchestration system designed to demonstrate advanced backend architectural patterns. Built as a monorepo, it implements a reliable producer-consumer queue system from scratch using Redis atomic operations, ensuring data integrity and fault tolerance even under high concurrency.

## Key Features

*   **Reliable Queueing**: Hand-crafted queue implementation using Redis `BRPOPLPUSH` pattern for atomic job claiming and processing guarantees (at-least-once delivery).
*   **Dependency Management**: Intelligent workflow orchestration supporting job hierarchies. Child jobs automatically enter a `waiting-parent` state and are unlocked only upon parent completion.
*   **Resiliency & Recovery**: Built-in failure handling with configurable automatic retries and exponential backoff strategies.
*   **Real-time Observability**: Next.js-based dashboard providing live insights into queue health, throughput, and job statuses via WebSockets (Socket.io) and Redis Pub/Sub.
*   **Distributed Architecture**: Decoupled design with separate scalable components:
    *   **Core**: Shared library encapsulating queue logic and Redis interactions.
    *   **API**: Express.js gateway for high-throughput job ingestion.
    *   **Worker**: Scalable consumer services that process jobs asynchronously.

## 🛠 Tech Stack

*   **Language**: TypeScript (Monorepo with TurboRepo)
*   **Core Infrastructure**: Redis (Persistence & Pub/Sub)
*   **Backend**: Node.js, Express
*   **Frontend**: Next.js, TailwindCSS
*   **DevOps**: Docker ready

## Engineering Highlights

*   **Atomic Operations**: Prevents race conditions and lost jobs during worker crashes.
*   **Event-Driven Architecture**: Decoupled communication for scalable processing.
*   **System Design**: Demonstrates understanding of distributed system challenges like orchestrating dependent tasks and managing partial failures.
