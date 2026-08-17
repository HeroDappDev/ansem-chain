import React, { useState, useEffect, useRef } from 'react';
import { useChainSim } from './chainSim';

interface HealthCheck { name: string; status: 'ok' | 'warning' | 'error'; details: string; }
interface SystemHealth { status: string; timestamp: string; checks: HealthCheck[]; }
interface SystemStats {
  agent: { isWorking: boolean; currentTask: string | null; completedTasks: number; brainActive: boolean; uptime: number; };
  system: { platform: string; nodeVersion: string; memory: { heapUsed: number; heapTotal: number; rss: number; }; cpu: { loadAvg1m: string; cores: number; }; };
  api: { totalCalls: number; tokensIn: number; tokensOut: number; estimatedCost: string; };
}
interface ActivityEntry { timestamp: string; type: string; message: string; }
interface GitStatus { branch: string; clean: boolean; changes: number; recentCommits: { shortHash: string; message: string; date: string }[]; }

// Simulated fallback data
const MOCK_HEALTH: SystemHealth = {
  status: 'operational',
  timestamp: new Date().toISOString(),
  checks: [
    { name: 'Database Connection', status: 'ok', details: 'Latency: 12ms' },
    { name: 'Agent Runtime', status: 'ok', details: 'Active threads: 4' },
    { name: 'Blockchain RPC', status: 'ok', details: 'Synced to block 118281' },
    { name: 'OpenAI API', status: 'warning', details: 'Rate limit approaching (85%)' }
  ]
};

const MOCK_STATS: SystemStats = {
  agent: { isWorking: true, currentTask: 'Optimize mempool sorting algorithm', completedTasks: 428, brainActive: true, uptime: 128400 },
  system: { platform: 'linux', nodeVersion: 'v20.10.0', memory: { heapUsed: 482, heapTotal: 1024, rss: 850 }, cpu: { loadAvg1m: '1.45', cores: 8 } },
  api: { totalCalls: 15420, tokensIn: 4500000, tokensOut: 1200000, estimatedCost: '$45.20' }
};

const MOCK_ACTIVITY: ActivityEntry[] = [
  { timestamp: new Date(Date.now() - 5000).toISOString(), type: 'system', message: 'Memory garbage collection triggered.' },
  { timestamp: new Date(Date.now() - 15000).toISOString(), type: 'agent', message: 'Task completed: "Resolve consensus edge case"' },
  { timestamp: new Date(Date.now() - 45000).toISOString(), type: 'git', message: 'Deployed commit 8a9b2c to main' }
];

export default function AdminDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [git, setGit] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chain = useChainSim();
  const usingMockRef = useRef(true);

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '';

  const fetchData = async () => {
    try {
      const [healthRes, statsRes, activityRes, gitRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/health`).catch(() => null),
        fetch(`${API_BASE}/api/admin/stats`).catch(() => null),
        fetch(`${API_BASE}/api/admin/activity?limit=20`).catch(() => null),
        fetch(`${API_BASE}/api/admin/git`).catch(() => null)
      ]);

      if (healthRes?.ok) setHealth(await healthRes.json()); else setHealth(MOCK_HEALTH);
      if (statsRes?.ok) { usingMockRef.current = false; setStats(await statsRes.json()); } else { usingMockRef.current = true; setStats(MOCK_STATS); }
      if (activityRes?.ok) {
        const data = await activityRes.json();
        setActivity(data.entries || MOCK_ACTIVITY);
      } else {
        setActivity(MOCK_ACTIVITY);
      }
      if (gitRes?.ok) setGit(await gitRes.json());
      
      setError(null);
    } catch (e) {
      // Fallbacks handle this
      setHealth(MOCK_HEALTH);
      setStats(MOCK_STATS);
      setActivity(MOCK_ACTIVITY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // While running on simulated data, keep the growing metrics in sync with the
  // shared chain world: completed tasks track shipped features, uptime and the
  // synced-block health line advance in real time. Real backend data wins.
  useEffect(() => {
    if (!usingMockRef.current) return;
    setStats(prev => prev ? {
      ...prev,
      agent: { ...prev.agent, completedTasks: 428 + chain.featuresShipped, uptime: chain.uptimeSec },
    } : prev);
    setHealth(prev => prev ? {
      ...prev,
      checks: prev.checks.map(c => c.name === 'Blockchain RPC'
        ? { ...c, details: `Synced to block ${chain.blockHeight.toLocaleString()}` }
        : c),
    } : prev);
  }, [chain]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading) {
    return <div className="page" style={{ textAlign: 'center', padding: 48 }}><span className="blink-cursor" /> Loading system diagnostics...</div>;
  }

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <h1 className="page-title glow-text-cyan">ADMIN DIAGNOSTICS</h1>
      <p className="page-desc">System health, performance metrics, and infrastructure status.</p>

      {error && (
        <div style={{ padding: 16, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-md)', marginBottom: 24, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="panel panel--green">
          <div className="panel-title">SYSTEM HEALTH</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {health?.checks.map((check, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px dashed var(--border)' }}>
                <span className="mono">{check.name}</span>
                <span className={check.status === 'ok' ? 'glow-text-green' : check.status === 'warning' ? 'glow-text-yellow' : ''} style={{ color: check.status === 'ok' ? 'var(--green-neon)' : check.status === 'warning' ? 'var(--yellow)' : 'var(--red)', fontSize: 13, fontWeight: 700 }}>
                  {check.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel panel--cyan">
          <div className="panel-title">AGENT STATUS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Status</span>
              <span style={{ color: stats?.agent.isWorking ? 'var(--cyan)' : 'var(--text-2)' }} className={stats?.agent.isWorking ? "glow-text-cyan mono" : "mono"}>{stats?.agent.isWorking ? 'ACTIVE' : 'IDLE'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Completed Tasks</span>
              <span className="mono glow-text-cyan">{stats?.agent.completedTasks || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Uptime</span>
              <span className="mono">{formatUptime(stats?.agent.uptime || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Cognitive Engine</span>
              <span style={{ color: stats?.agent.brainActive ? 'var(--green-neon)' : 'var(--red)' }} className={stats?.agent.brainActive ? "glow-text-green mono" : "mono"}>{stats?.agent.brainActive ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>

        <div className="panel panel--magenta">
          <div className="panel-title">API USAGE & METRICS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Total Requests</span>
              <span className="mono glow-text-magenta">{stats?.api.totalCalls || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Tokens In</span>
              <span className="mono">{(stats?.api.tokensIn || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Tokens Out</span>
              <span className="mono">{(stats?.api.tokensOut || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Estimated Cost</span>
              <span className="mono glow-text-magenta" style={{ color: 'var(--magenta)' }}>{stats?.api.estimatedCost || '$0.00'}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">SYSTEM RESOURCES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Heap Memory</span>
              <span className="mono glow-text-cyan">{stats?.system.memory.heapUsed}MB / {stats?.system.memory.heapTotal}MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>RSS Memory</span>
              <span className="mono">{stats?.system.memory.rss}MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>CPU Load</span>
              <span className="mono">{stats?.system.cpu.loadAvg1m} ({stats?.system.cpu.cores} cores)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Environment</span>
              <span className="mono">{stats?.system.platform}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
