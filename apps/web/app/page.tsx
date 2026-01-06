'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Types
interface Job {
  id: string;
  name: string;
  data: any;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'waiting-parent';
  timestamp: number;
  attemptsMade?: number;
  opts?: {
    maxAttempts?: number;
    parent?: string;
  };
}

interface Stats {
  waitCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  delayedCount: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ waitCount: 0, activeCount: 0, completedCount: 0, failedCount: 0, delayedCount: 0 });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data.counts);
        setJobs(data.jobs);
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);



// ... (inside component)

  const createJob = async () => {
    setIsCreating(true);
    const promise = fetch('http://localhost:4000/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'system-audit',
          data: { 
            target: `service-${Math.random().toString(36).substring(7)}`,
            timestamp: Date.now()
          }
        })
    }).then(async (res) => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
    });

    toast.promise(promise, {
        loading: 'Dispatching job to worker fleet...',
        success: (data) => `Job ${data.job.id.substring(0,8)} dispatched successfully`,
        error: 'Failed to connect to API Server (Ensure port 4000 is active)',
    });

    try {
        await promise;
    } catch (e) {
        console.error(e);
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <div className="max-w-5xl mx-auto p-8 pt-12">
        {/* Header */}
        <header className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="w-3 h-3 bg-white rounded-sm" />
               <h1 className="text-xl font-bold tracking-tight">JobFlow Control</h1>
            </div>
            <p className="text-zinc-500 text-sm">Local Worker Fleet</p>
          </div>
          
          <button 
            onClick={createJob}
            disabled={isCreating}
            className="h-9 px-4 text-sm font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors rounded-md border border-transparent shadow-sm"
          >
            {isCreating ? 'Dispatching...' : 'Dispatch Job'}
          </button>
        </header>

        {/* Overview Cards */}
        <div className="grid grid-cols-5 gap-4 mb-12">
          <StatCard label="In Queue" value={stats.waitCount} />
          <StatCard label="Processing" value={stats.activeCount} active />
          <StatCard label="Processed" value={stats.completedCount} />
          <StatCard label="Errors" value={stats.failedCount} />
          <StatCard label="Delayed / Retrying" value={stats.delayedCount} />
        </div>

        {/* Activity Feed */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-zinc-400">Recent Activity</h2>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
               Live Connection
            </div>
          </div>
          
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/50">
            <div className="grid grid-cols-[1fr_2fr_1fr] bg-zinc-900/50 px-4 py-2 border-b border-zinc-800 text-xs font-medium text-zinc-500">
              <div>STATUS</div>
              <div>PAYLOAD / ID</div>
              <div className="text-right">TIMESTAMP</div>
            </div>
            
            <div className="divide-y divide-zinc-800/50">
              {jobs.map((job) => (
                <div key={job.id} className="grid grid-cols-[1fr_2fr_1fr] px-4 py-3 text-sm items-center hover:bg-zinc-900/30 transition-colors">
                  <div>
                    <Badge status={job.status} />
                  </div>
                  <div className="font-mono text-xs text-zinc-400">
                    <div className="text-zinc-300 mb-0.5 flex items-center gap-2">
                        {job.id.substring(0, 8)}...
                        {job.status === 'waiting-parent' && job.opts?.parent && (
                            <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-1 rounded">waiting for {job.opts.parent.substring(0,8)}</span>
                        )}
                        {job.status === 'delayed' && (
                             <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1 rounded">Retry {job.attemptsMade}/{job.opts?.maxAttempts || '?'}</span>
                        )}
                    </div>
                    <div className="truncate opacity-60">{JSON.stringify(job.data)}</div>
                  </div>
                  <div className="text-right text-xs text-zinc-600 font-mono">
                    {new Date(job.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-zinc-600">
                  No activity recorded in the current session.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, active = false }: { label: string, value: number, active?: boolean }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-md">
      <div className="text-xs font-medium text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight ${active && value > 0 ? 'text-white' : 'text-zinc-200'}`}>
        {value}
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-zinc-100 text-black border-zinc-200',
    failed: 'bg-red-950/20 text-red-500 border-red-900/30',
    active: 'bg-blue-950/20 text-blue-500 border-blue-900/30',
    waiting: 'bg-amber-950/20 text-amber-500 border-amber-900/30',
    delayed: 'bg-purple-950/20 text-purple-500 border-purple-900/30',
    'waiting-parent': 'bg-indigo-950/20 text-indigo-500 border-indigo-900/30'
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${styles[status] || styles.waiting} uppercase tracking-wider`}>
      {status}
    </span>
  )
}
