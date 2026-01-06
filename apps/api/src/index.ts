import { JobQueue } from '@jobflow/core';
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json());

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
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
