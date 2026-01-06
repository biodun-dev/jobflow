import { JobQueue } from '@jobflow/core';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import Redis from 'ioredis';
import { Server } from 'socket.io';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Redis Subscriber for Events
const redisSub = new Redis({ host: 'localhost', port: 6379 });
redisSub.subscribe('jobflow:events', (err: any, count: any) => {
    if (err) console.error('Failed to subscribe:', err);
    else console.log(`Subscribed to ${count} channels`);
});

redisSub.on('message', (channel: string, message: string) => {
    console.log(`Received event on ${channel}`);
    const parsed = JSON.parse(message);
    io.emit('job:update', parsed); // Broadcast to all clients
});

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });
});

const emailQueue = new JobQueue('email', {
    connection: { host: 'localhost', port: 6379 } // In prod, use env vars
});

app.post('/jobs', async (req, res) => {
    const { name, data, options } = req.body;
    try {
        const job = await emailQueue.add(name || 'default', data || {}, options);
        res.json({ success: true, job });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 4000;
httpServer.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
