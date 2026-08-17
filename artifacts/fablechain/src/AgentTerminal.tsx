import React, { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeAgentSim, SimEvent } from './agentSim';
import { getCommits, REPO_URL } from './commits';

interface Task { id: string; title: string; type: string; agent: string; }
interface Decision { action: string; reasoning: string; }
interface CompletedTask { title: string; agent: string; completedAt: string; }
interface RecentCommit { sha: string; shortSha: string; message: string; author: string; date: string; url: string; }
interface GitHubCommitResponse { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string; } | null; }; }

interface AgentState {
  isWorking: boolean;
  currentTask: Task | null;
  currentOutput: string;
  completedTasks: CompletedTask[];
  viewerCount: number;
  brainActive: boolean;
  currentDecision: Decision | null;
}

const AgentTerminal: React.FC = () => {
  const [state, setState] = useState<AgentState>({
    isWorking: false,
    currentTask: null,
    currentOutput: '',
    completedTasks: [],
    viewerCount: 0,
    brainActive: false,
    currentDecision: null,
  });
  const [connected, setConnected] = useState(false);
  const [simActive, setSimActive] = useState(false);
  const connectedRef = useRef(false);
  const seededRef = useRef(false);
  const [displayedText, setDisplayedText] = useState('');
  const [recentCommits, setRecentCommits] = useState<RecentCommit[]>([]);
  const [recentCommitsLoading, setRecentCommitsLoading] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);
  const textBufferRef = useRef('');
  const displayIndexRef = useRef(0);
  const animationFrameRef = useRef<number>();

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '';

  const normalizeGitHubCommits = useCallback((commits: GitHubCommitResponse[]): RecentCommit[] => {
    return commits.map(commit => ({
      sha: commit.sha,
      shortSha: commit.sha.slice(0, 7),
      message: (commit.commit.message || 'Commit').split('\n')[0],
      author: commit.commit.author?.name || 'GitHub',
      date: commit.commit.author?.date || '',
      url: commit.html_url,
    }));
  }, []);

  const loadRecentCommits = useCallback(async () => {
    setRecentCommitsLoading(true);
    try {
      const localResponse = await fetch(`${API_BASE}/api/git/status`);
      if (localResponse.ok) {
        const data = await localResponse.json();
        if (data.recentCommits?.length) {
          setRecentCommits(data.recentCommits.map((commit: any) => ({
            sha: commit.hash,
            shortSha: commit.shortHash,
            message: commit.message,
            author: commit.author,
            date: commit.date,
            url: `${REPO_URL}/commit/${commit.hash}`,
          })));
          return;
        }
      }
      setRecentCommits(normalizeGitHubCommits(await getCommits(5)));
    } catch (error) {
      setRecentCommits(normalizeGitHubCommits(await getCommits(5)));
    } finally {
      setRecentCommitsLoading(false);
    }
  }, [API_BASE, normalizeGitHubCommits]);

  const typewriterEffect = useCallback(() => {
    const buffer = textBufferRef.current;
    const currentIndex = displayIndexRef.current;
    
    if (currentIndex < buffer.length) {
      const charsToAdd = Math.min(3, buffer.length - currentIndex);
      displayIndexRef.current = currentIndex + charsToAdd;
      setDisplayedText(buffer.slice(0, displayIndexRef.current));
      animationFrameRef.current = requestAnimationFrame(typewriterEffect);
    } else {
      animationFrameRef.current = undefined;
    }
  }, []);

  const appendText = useCallback((text: string) => {
    textBufferRef.current += text;
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(typewriterEffect);
    }
  }, [typewriterEffect]);

  const resetOutput = useCallback(() => {
    textBufferRef.current = '';
    displayIndexRef.current = 0;
    setDisplayedText('');
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [displayedText]);

  useEffect(() => {
    const loadPersistedTasks = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/agent/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.recentTasks && data.recentTasks.length > 0) {
            setState(prev => ({
              ...prev,
              completedTasks: data.recentTasks,
              isWorking: data.isWorking,
              currentTask: data.currentTask,
              viewerCount: data.viewerCount || 0,
            }));
          }
        }
      } catch (e) {
        console.error('[AgentTerminal] Failed to load persisted tasks:', e);
      }
    };
    loadPersistedTasks();
  }, [API_BASE]);

  useEffect(() => {
    loadRecentCommits();
    const refresh = setInterval(loadRecentCommits, 60000);
    return () => clearInterval(refresh);
  }, [loadRecentCommits]);

  const processEvent = useCallback((data: SimEvent) => {
    switch (data.type) {
      case 'init':
        setState(prev => ({
          ...prev,
          isWorking: data.data.isWorking !== undefined ? data.data.isWorking : true,
          currentTask: data.data.currentTask,
          completedTasks: data.data.completedTasks || [],
          viewerCount: data.data.viewerCount || 1,
        }));
        if (data.data.currentOutput) {
          textBufferRef.current = data.data.currentOutput;
          displayIndexRef.current = data.data.currentOutput.length;
          setDisplayedText(data.data.currentOutput);
        }
        break;

      case 'task_start':
        resetOutput();
        setState(prev => ({
          ...prev,
          isWorking: true,
          currentTask: data.data.task || { id: 'task', title: data.data.taskTitle || 'Analyzing network state', type: 'analysis', agent: 'CLAUDE ANSEM 5' },
          brainActive: data.data.brainActive !== undefined ? data.data.brainActive : true,
          currentDecision: data.data.decision || null,
        }));
        break;

      case 'brain_status':
        setState(prev => ({ ...prev, brainActive: data.data.active }));
        break;

      case 'text':
        appendText(data.data);
        break;

      case 'tool_start':
        appendText(`\n> [TOOL] ${data.data.tool}\n`);
        break;

      case 'tool_complete':
        if (data.data.result?.error) appendText(`> [ERROR] ${data.data.result.error}\n`);
        break;

      case 'agent_thought':
        appendText(`\n[THINKING] ${data.data.thought}\n`);
        break;

      case 'task_complete':
        setState(prev => ({
          ...prev,
          isWorking: false,
          completedTasks: [
            { title: data.data.title, agent: prev.currentTask?.agent || 'CLAUDE ANSEM 5', completedAt: new Date().toISOString() },
            ...prev.completedTasks.slice(0, 4),
          ],
        }));
        break;

      case 'git_deploy':
        appendText(`\n[DEPLOYED] Commit ${data.data.commit} pushed to ${data.data.branch || 'main'}\n`);
        appendText(`  Message: ${data.data.message}\n`);
        appendText(`  View: ${REPO_URL}/commit/${data.data.commit}\n`);
        break;

      case 'status':
        if (data.data.status === 'idle') setState(prev => ({ ...prev, isWorking: false }));
        break;

      case 'heartbeat':
        setState(prev => ({ ...prev, viewerCount: data.viewerCount || prev.viewerCount }));
        break;
    }
  }, [appendText, resetOutput]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource(`${API_BASE}/api/agent/stream`);
      eventSource.onopen = () => {
        connectedRef.current = true;
        setConnected(true);
        setSimActive(false);
        resetOutput();
      };
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          processEvent(data);
          if (data.type === 'git_deploy') loadRecentCommits();
        } catch (e) {
          console.error('[AgentTerminal] Parse error:', e);
        }
      };
      eventSource.onerror = () => {
        connectedRef.current = false;
        setConnected(false);
        eventSource?.close();
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [API_BASE, processEvent, resetOutput, loadRecentCommits]);

  useEffect(() => {
    // Seed a lively initial state ONCE so the panel never looks dead while
    // offline. Guard on connectedRef so a real backend stream is never stomped,
    // and on seededRef so a re-run of this effect can't re-append the banner.
    if (!connectedRef.current && !seededRef.current) {
      seededRef.current = true;
      setSimActive(true);
      setState(prev => ({ ...prev, isWorking: true, currentTask: { id: 'init', title: 'Monitoring chain telemetry...', type: 'monitor', agent: 'CLAUDE ANSEM 5' } }));
      appendText("Initializing connection to ANSEM CHAIN...\nSyncing latest state...\n");
    }

    const unsubscribe = subscribeAgentSim(evt => {
      if (connectedRef.current) return;
      setSimActive(true);
      // Force working state for sim events to make it look alive
      if (evt.type !== 'status' && evt.type !== 'task_complete') {
        setState(prev => (prev.isWorking ? prev : { ...prev, isWorking: true }));
      }
      processEvent(evt);
    });
    return unsubscribe;
  }, [processEvent, appendText]);

  const renderOutput = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('> [TOOL]')) return <div key={i} style={{ color: 'var(--cyan)', marginTop: 8 }}>{line}</div>;
      if (line.startsWith('[Executing:')) return <div key={i} style={{ color: 'var(--yellow)', marginTop: 4 }}>{line}</div>;
      if (line.startsWith('[THINKING]')) return <div key={i} style={{ color: 'var(--magenta)', marginTop: 8 }}>{line.replace('[THINKING] ', '')}</div>;
      if (line.startsWith('[DEPLOYED]')) return <div key={i} style={{ color: 'var(--green-neon)', marginTop: 8 }}>{line}</div>;
      if (line.startsWith('> [ERROR]')) return <div key={i} style={{ color: 'var(--red)', marginTop: 8 }}>{line}</div>;
      if (line.startsWith('```')) return <div key={i} style={{ color: 'var(--text-3)', marginTop: 8 }}>{line}</div>;
      return <div key={i} style={{minHeight: 18}}>{line || ''}</div>;
    });
  };

  const isLive = connected || simActive;

  return (
    <div className="agent-panel">
      <div className="term-titlebar">
        <span className="tt-label">ansem-5@ansem-chain:~</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(state.brainActive || simActive) && (
            <span style={{ color: 'var(--green-neon)', fontSize: 10, fontWeight: 700, border: '1px solid var(--green-neon)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }} className="glow-text-green">AUTO</span>
          )}
          <span style={{ color: isLive ? 'var(--cyan)' : 'var(--red)', fontSize: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }} className={isLive ? 'glow-text-cyan' : ''}>
            <span className={`live-dot ${isLive ? '' : 'offline'}`} /> {isLive ? (state.isWorking ? 'WORKING' : 'ACTIVE') : 'OFFLINE'}
          </span>
        </div>
      </div>

      {(state.currentTask || simActive) && (
        <div style={{ background: 'var(--bg-2)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ background: 'var(--cyan)', color: 'var(--bg-0)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700 }} className="mono">
              {state.currentTask?.agent || 'CLAUDE ANSEM 5'}
            </span>
            <span style={{ color: 'var(--text-0)', fontSize: 13, flex: 1 }} className="mono">{state.currentTask?.title || 'Analyzing network state...'}</span>
          </div>
          {state.brainActive && state.currentDecision?.reasoning && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--cyan-dim)', borderLeft: '2px solid var(--cyan)', fontSize: 12, color: 'var(--text-1)' }} className="mono">
              "{state.currentDecision.reasoning}"
            </div>
          )}
        </div>
      )}

      <div ref={outputRef} style={{ flex: 1, overflowY: 'auto', padding: 16, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6 }}>
        {displayedText ? (
          <>
            {renderOutput(displayedText)}
            {(state.isWorking || simActive) && <span className="blink-cursor" style={{ marginLeft: 4 }} />}
          </>
        ) : (
          <div style={{ color: 'var(--text-3)' }}><span className="blink-cursor" /></div>
        )}
      </div>

      <div style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--border)', padding: '16px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>──[ RECENT DEPLOYMENTS ]──</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentCommits.slice(0,2).map(c => (
            <a key={c.sha} href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', gap: 12, textDecoration: 'none', color: 'inherit', fontSize: 13 }}>
              <span className="mono glow-text-cyan" style={{ color: 'var(--cyan)' }}>{c.shortSha}</span>
              <span style={{ color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.message}</span>
            </a>
          ))}
          {recentCommits.length === 0 && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>No recent deployments.</span>}
        </div>
      </div>
    </div>
  );
};

export default AgentTerminal;
