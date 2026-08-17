import React, { useState, useEffect, useRef } from 'react';
import AgentTerminal from './AgentTerminal';
import AdminDashboard from './AdminDashboard';
import BlockExplorer from './BlockExplorer';
import Docs from './Docs';
import { subscribeAgentSim } from './agentSim';
import { getCommits, getCommitCount, REPO_URL } from './commits';
import { useChainSim } from './chainSim';
import { WORLD_MAP, CITY } from './ascii';
import { generateWallet } from './solanaWallet';

type TabType = 'terminal' | 'genesis' | 'molt' | 'updates' | 'logs' | 'explorer' | 'faucet' | 'wallet' | 'admin' | 'docs';

interface Message {
  role: 'user' | 'molt' | 'system';
  content: string;
}

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <img src="/logo.png" alt="Logo" style={{ height: 28 }} />
  </div>
);


const fmtUptime = (sec: number) => {
  const d = Math.floor(sec / 86400);
  const h = String(Math.floor((sec % 86400) / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${d}D ${h}:${m}:${s}`;
};

const fmtCountdown = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const SOL_WALLET_KEY = 'ansemchain_solana_wallet';

const CONTRACT_ADDRESS = 'HbnfHRC5Gz2gDdBuDBYhhDDY82RAxsiS8NJoUTVjpump';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);
  const [stats, setStats] = useState({ chainLength: 0, blockHeight: 0, tps: 0 });
  const [commits, setCommits] = useState<any[]>([]);
  const [commitCount, setCommitCount] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [chainLive, setChainLive] = useState(false);
  const [sentHistory, setSentHistory] = useState<string[]>([]);
  const histIdx = useRef(-1);
  const [locationPath, setLocationPath] = useState(() => window.location.pathname);

  const [solWallet, setSolWallet] = useState<{
    evmAddress: string;
    evmPath: string;
    solanaAddress: string;
    solanaPath: string;
  } | null>(null);
  const [solSeedPhrase, setSolSeedPhrase] = useState<string | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedAck, setSeedAck] = useState(false);
  const [seedCountdown, setSeedCountdown] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [faucetAddress, setFaucetAddress] = useState('');

  const [streamingMsg, setStreamingMsg] = useState<string | null>(null);
  const streamRef = useRef<{ target: string; idx: number; timer: number | null } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const lastBlockTime = useRef<number>(Date.now());
  const recentTxCounts = useRef<number[]>([]);

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '';

  const chain = useChainSim();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    try {
      // one-time migration from the legacy storage key
      const legacyKey = atob('YmJjX3NvbGFuYV93YWxsZXQ=');
      const legacy = localStorage.getItem(legacyKey);
      if (legacy && !localStorage.getItem(SOL_WALLET_KEY)) {
        localStorage.setItem(SOL_WALLET_KEY, legacy);
      }
      if (legacy) localStorage.removeItem(legacyKey);
      const saved = localStorage.getItem(SOL_WALLET_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.evmAddress && parsed?.solanaAddress) {
          setSolWallet({
            evmAddress: parsed.evmAddress,
            evmPath: parsed.evmPath || "m/44'/60'/0'/0/0",
            solanaAddress: parsed.solanaAddress,
            solanaPath: parsed.solanaPath || "m/44'/501'/0'/0'",
          });
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    if (!showSeedModal) return;
    const timer = setInterval(() => {
      setSeedCountdown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSeedModal]);


  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/agent/status`);
        if (res.ok) {
          const data = await res.json();
          const bh = data.blockHeight || 0;
          const tx = data.transactionCount || 0;
          const now = Date.now();
          lastBlockTime.current = now;
          recentTxCounts.current.push(tx);
          if (recentTxCounts.current.length > 10) recentTxCounts.current.shift();
          const avg = recentTxCounts.current.length > 1
            ? (recentTxCounts.current[recentTxCounts.current.length - 1] - recentTxCounts.current[0]) / (recentTxCounts.current.length * 3)
            : 0;
          setStats({ chainLength: bh, blockHeight: bh, tps: Math.max(0, Math.round(avg * 10) / 10) });
          setChainLive(true);
        } else {
          setChainLive(false);
        }
      } catch { setChainLive(false); }
    };
    fetch_();
    const id = setInterval(fetch_, 3000);
    return () => clearInterval(id);
  }, [API_BASE]);

  useEffect(() => {
    const refresh = () => {
      getCommits(30).then(commits => {
        setCommits(commits);
        setCommitCount(getCommitCount());
      });
    };
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const path = locationPath.slice(1) || 'terminal';
    const valid: TabType[] = ['terminal', 'genesis', 'molt', 'updates', 'logs', 'explorer', 'faucet', 'wallet', 'admin', 'docs'];
    if (valid.includes(path as TabType)) setActiveTab(path as TabType);
  }, [locationPath]);

  useEffect(() => {
    const handlePopState = () => setLocationPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Use sim logs to populate Logs tab and make it feel alive
  useEffect(() => {
    let n = 0;
    
    // Initial mock logs to ensure it's never completely empty immediately
    setLogs([
      { id: 'boot-0', timestamp: new Date(Date.now() - 10000).toISOString(), type: 'system', content: 'Initializing ANSEM CHAIN core components...' },
      { id: 'boot-1', timestamp: new Date(Date.now() - 8000).toISOString(), type: 'system', content: 'Synchronizing with genesis block...' },
      { id: 'boot-2', timestamp: new Date(Date.now() - 5000).toISOString(), type: 'agent', content: 'Ready for telemetry.' }
    ]);
    
    const unsubscribe = subscribeAgentSim(evt => {
      let type: string, content: string;
      switch (evt.type) {
        case 'task_start': type = 'task_start'; content = evt.data.task.title; break;
        case 'agent_thought': type = 'system'; content = evt.data.thought; break;
        case 'tool_start': type = 'tool_use'; content = evt.data.tool; break;
        case 'git_deploy': type = 'git_commit'; content = `${evt.data.commit} ${evt.data.message}`; break;
        case 'task_complete': type = 'task_complete'; content = evt.data.title; break;
        default: return;
      }
      setLogs(p => [...p.slice(-200), {
        id: `sim-${++n}`,
        timestamp: new Date().toISOString(),
        type,
        content,
        taskTitle: evt.data.taskTitle,
      }]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingMsg]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const startStream = (text: string) => {
    if (streamRef.current?.timer) clearTimeout(streamRef.current.timer);
    streamRef.current = { target: text, idx: 0, timer: null };
    const tick = () => {
      const sr = streamRef.current;
      if (!sr) return;
      const next = Math.min(sr.idx + 4, sr.target.length);
      setStreamingMsg(sr.target.slice(0, next));
      sr.idx = next;
      if (next < sr.target.length) {
        sr.timer = window.setTimeout(tick, 22);
      } else {
        setMessages(p => [...p, { role: 'molt', content: text }]);
        setStreamingMsg(null);
        streamRef.current = null;
      }
    };
    tick();
  };

  const handleTab = (tab: TabType) => {
    setActiveTab(tab);
    const nextPath = tab === 'terminal' ? '/' : `/${tab}`;
    window.history.pushState(null, '', nextPath);
    setLocationPath(window.location.pathname);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setSentHistory(p => [...p, msg]);
    histIdx.current = -1;
    const conversationHistory = [...messages.slice(-9), { role: 'user', content: msg }].map(entry => ({
      role: entry.role === 'user' ? 'user' : 'assistant',
      content: entry.content
    }));
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);

    if (msg.startsWith('/')) {
      const cmd = msg.slice(1).toLowerCase();
      if (['genesis', 'molt', 'updates', 'logs', 'council', 'agents', 'archive'].includes(cmd)) {
        handleTab(cmd as TabType);
        setMessages(p => [...p, { role: 'system', content: `Navigating to ${cmd}...` }]);
        setLoading(false);
        return;
      }
      if (cmd === 'clear') { setMessages([]); setLoading(false); return; }
    }

    try {
      const res = await fetch(`${API_BASE}/api/personality/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationHistory })
      });
      setLoading(false);
      if (res.ok) {
        const data = await res.json();
        startStream(data.message || data.response);
      } else {
        startStream('Processing your request... The validators are deliberating.');
      }
    } catch {
      setLoading(false);
      startStream('Network sync in progress. The chain continues autonomously.');
    }
  };

  const handleCmdKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { sendMessage(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!sentHistory.length) return;
      histIdx.current = histIdx.current < 0 ? sentHistory.length - 1 : Math.max(0, histIdx.current - 1);
      setInput(sentHistory[histIdx.current]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx.current < 0) return;
      histIdx.current += 1;
      if (histIdx.current >= sentHistory.length) { histIdx.current = -1; setInput(''); }
      else setInput(sentHistory[histIdx.current]);
    }
  };

  const tabs = [
    { id: 'terminal', label: 'Terminal' },
    { id: 'molt', label: 'Chat' },
    { id: 'explorer', label: 'Explorer' },
    { id: 'faucet', label: 'Faucet' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'updates', label: 'Updates' },
    { id: 'logs', label: 'Logs' },
    { id: 'docs', label: 'Docs' },
    { id: 'admin', label: 'Admin' },
  ] as const;

  const blockHeight = chainLive ? stats.blockHeight : chain.blockHeight;

  const renderTerminal = () => (
    <div className="dash">
      <section className="panel panel--cyan">
        <div className="panel-title">SYSTEM IDENTITY</div>
        <div className="lp-body">
          <img src="/system-identity.png" className="lp-logo" alt="Ansem Chain" />
        </div>
        <div className="lp-tag glow-text-chrome font-display">ANSEM CHAIN</div>
        <div className="lp-status mono">
          <span><span className="k">AI CONSCIOUSNESS: </span><span className="v-green glow-text-green">ONLINE</span></span>
          <span><span className="k">MODEL: </span><span className="v-cyan glow-text-cyan">CLAUDE ANSEM 5</span></span>
          <span><span className="k">STATUS: </span><span className="v-green">SYNCHRONIZED</span></span>
        </div>
      </section>

      <section className="panel panel--magenta">
        <div className="panel-title">NETWORK METRICS</div>
        <div className="ss-body">
          <div className="kv mono">
            <div><span className="k">NODE ID</span>: <span className="v-cyan glow-text-cyan">0x7A9B</span></div>
            <div><span className="k">UPTIME</span>: <span className="v-yellow">{fmtUptime(chain.uptimeSec)}</span></div>
            <div><span className="k">HEIGHT</span>: <span className="v-yellow glow-text-yellow">{blockHeight.toLocaleString()}</span></div>
            <div><span className="k">PEERS</span>: <span className="v-cyan">{chain.peers}</span></div>
            <div><span className="k">GAS PRICE</span>: <span className="v-yellow">{chain.gas.toFixed(5)} ANSEMCHAIN</span></div>
            <div><span className="k">MEMPOOL</span>: <span className="v-yellow">{chain.mempool} TX</span></div>
          </div>
          {!isMobile && <pre className="ss-art glow-text-magenta">{CITY}</pre>}
        </div>
      </section>
      
      <section className="panel panel--magenta" style={{ gridColumn: isMobile ? '1' : 'span 2' }}>
        <div className="panel-title">MEMPOOL ACTIVITY</div>
        <table className="dtable">
          <thead><tr><th>TX HASH</th><th>FROM</th><th>TO</th><th>VALUE</th><th>FEE</th></tr></thead>
          <tbody>
            {chain.txs.map(t => (
              <tr key={t.hash} className={t.fresh ? 'row-new' : ''}>
                <td className="mono" style={{ color: 'var(--cyan)' }}>{`${t.hash.slice(0, 8)}...${t.hash.slice(-4)}`}</td>
                <td className="mono">{t.from}</td>
                <td className="mono">{t.to}</td>
                <td className="mono glow-text-green">{t.value} ANSEMCHAIN</td>
                <td className="mono" style={{ color: 'var(--text-3)' }}>{t.fee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel panel--green" style={{ gridColumn: isMobile ? '1' : 'span 2' }}>
        <div className="panel-title">LATEST BLOCKS</div>
        <table className="dtable feed-table">
          <thead><tr><th>HEIGHT</th><th>HASH</th><th>SUMMARY</th><th>TIME</th></tr></thead>
          <tbody>
            {chain.blocks.map(b => (
              <tr key={b.height} className={b.fresh ? 'row-new' : ''}>
                <td className="mono glow-text-yellow">{b.height.toLocaleString()}</td>
                <td className="mono" style={{ color: 'var(--cyan)' }}>{`${b.hash.slice(0, 6)}...${b.hash.slice(-4)}`}</td>
                <td>{b.summary}</td>
                <td className="mono" style={{ color: 'var(--text-3)' }}>{new Date(b.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      {!isMobile && (
        <section className="panel panel--cyan" style={{ gridColumn: 'span 2' }}>
          <div className="panel-title">GLOBAL NETWORK MAP</div>
          <pre className="mono glow-text-cyan" style={{ color: 'var(--cyan-muted)', textAlign: 'center', fontSize: 10, lineHeight: 1.2, opacity: 0.8 }}>
            {WORLD_MAP}
          </pre>
        </section>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="page">
      <div className="panel panel--cyan" style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-title">SECURE COMM LINK — CLAUDE ANSEM 5</div>
        <div className="console-log">
          {messages.length === 0 && (
            <div style={{ color: 'var(--text-2)', textAlign: 'center', marginTop: 100 }}>
              Connection established to CLAUDE ANSEM 5. Awaiting input...
              <br /><span className="blink-cursor" style={{ marginTop: 16 }} />
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="cl-entry">
              {m.role === 'user' ? (
                <div className="cl-who">USER: <span className="cl-user-msg">{m.content}</span></div>
              ) : m.role === 'molt' ? (
                <div className="cl-bot">{m.content}</div>
              ) : (
                <div className="cl-thinking">{m.content}</div>
              )}
            </div>
          ))}
          {loading && <div className="cl-thinking glow-text-magenta">Processing request...</div>}
          {streamingMsg !== null && (
            <div className="cl-entry">
              <div className="cl-bot">{streamingMsg}<span className="blink-cursor" /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="console-input">
          <input
            className="ci-field"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleCmdKey}
            placeholder="Enter command..."
            disabled={loading || streamingMsg !== null}
          />
          <button className="ci-send" onClick={sendMessage} disabled={loading || streamingMsg !== null || !input.trim()}>EXECUTE</button>
        </div>
      </div>
    </div>
  );

  const renderFaucet = () => {
    const addr = faucetAddress.trim();
    const isValidEvm = /^0x[a-fA-F0-9]{40}$/.test(addr);
    const showError = addr.length > 0 && !isValidEvm;
    return (
      <div className="center-card">
        <div className="icon glow-text-cyan">ANSEMCHAIN FAUCET</div>
        <h2 className="glow-text-cyan">Testnet Tokens</h2>
        <div className="desc">Request ANSEMCHAIN testnet tokens to interact with Ansem Chain.</div>
        <div className="faucet-field">
          <input
            className={`input faucet-input${isValidEvm ? ' is-valid' : ''}`}
            placeholder="Wallet Address (0x...)"
            value={faucetAddress}
            onChange={e => setFaucetAddress(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          {isValidEvm && (
            <span className="faucet-check" aria-label="Valid EVM address">✓</span>
          )}
        </div>
        {showError && (
          <div className="faucet-msg faucet-msg-error">
            That address won't work here. The ANSEMCHAIN faucet only accepts EVM-compatible addresses (0x
            followed by 40 hex characters) generated from a wallet on Ansem Chain. Solana
            and other address formats aren't supported.
          </div>
        )}
        {isValidEvm && (
          <div className="faucet-msg faucet-msg-ok">Address verified — you're clear to request tokens.</div>
        )}
        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 16 }}
          disabled={!isValidEvm}
        >
          REQUEST TOKENS
        </button>
        <div className="hint">Limits: 10 ANSEMCHAIN per 24 hours.</div>
      </div>
    );
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateWallet = () => {
    const wallet = generateWallet();
    setSolWallet({
      evmAddress: wallet.evmAddress,
      evmPath: wallet.evmPath,
      solanaAddress: wallet.solanaAddress,
      solanaPath: wallet.solanaPath,
    });
    setSolSeedPhrase(wallet.mnemonic);
    try {
      localStorage.setItem(
        SOL_WALLET_KEY,
        JSON.stringify({
          evmAddress: wallet.evmAddress,
          evmPath: wallet.evmPath,
          solanaAddress: wallet.solanaAddress,
          solanaPath: wallet.solanaPath,
        }),
      );
    } catch {
      /* ignore storage failures */
    }
    setSeedAck(false);
    setSeedCountdown(120);
    setShowSeedModal(true);
  };

  const handleRegenerateWallet = () => {
    const ok = window.confirm(
      'This will REPLACE your current wallet with a brand new one.\n\n' +
        'If you funded the current wallet and did not save its 12-word recovery phrase, ' +
        'those funds will be lost forever.\n\nGenerate a new wallet anyway?',
    );
    if (ok) handleGenerateWallet();
  };

  const openSeedModal = () => {
    setSeedAck(false);
    setSeedCountdown(120);
    setShowSeedModal(true);
  };

  const renderWallet = () => (
    <div className="center-card" style={{ maxWidth: 560 }}>
      <div className="icon glow-text-cyan">WALLET</div>
      {solWallet ? (
        <>
          <h2 className="glow-text-cyan">ANSEM CHAIN WALLET</h2>
          <div className="desc">
            Your self-custodial multichain wallet. One 12-word recovery phrase secures your keys
            across Solana, Ethereum, and more — import it into a multichain wallet like Phantom to
            manage every chain in one place.
          </div>
          <div className="hint" style={{ marginBottom: 6 }}>EVM address · Ethereum &amp; all EVM chains</div>
          <div className="wallet-address-box">
            <span className="addr">{solWallet.evmAddress}</span>
            <button
              className="wallet-copy-btn"
              onClick={() => copyText(solWallet.evmAddress, 'evm')}
            >
              {copiedField === 'evm' ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <div className="hint" style={{ marginTop: 16, marginBottom: 6 }}>Solana address</div>
          <div className="wallet-address-box">
            <span className="addr">{solWallet.solanaAddress}</span>
            <button
              className="wallet-copy-btn"
              onClick={() => copyText(solWallet.solanaAddress, 'sol')}
            >
              {copiedField === 'sol' ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <div className="hint" style={{ marginTop: 8 }}>
            One multichain recovery phrase secures every chain. Use your EVM address for the ANSEMCHAIN
            faucet.
          </div>
          {solSeedPhrase && (
            <button
              className="btn-ghost"
              onClick={openSeedModal}
              style={{ width: '100%', marginTop: 24 }}
            >
              VIEW RECOVERY PHRASE
            </button>
          )}
          <button
            className="btn-primary"
            onClick={handleRegenerateWallet}
            style={{ width: '100%', marginTop: 12 }}
          >
            GENERATE NEW WALLET
          </button>
          {!solSeedPhrase && (
            <div className="hint" style={{ marginTop: 16 }}>
              For your security, a recovery phrase is only shown once at creation.
            </div>
          )}
        </>
      ) : (
        <>
          <h2 className="glow-text-cyan">ANSEM CHAIN WALLET</h2>
          <div className="desc">
            Create a real, self-custodial multichain wallet secured by a single 12-word recovery
            phrase — works across Solana, Ethereum, and more, fully importable into a multichain
            wallet like Phantom.
          </div>
          <button className="btn-primary" onClick={handleGenerateWallet} style={{ width: '100%' }}>
            GENERATE NEW WALLET
          </button>
          <div className="hint">
            One recovery phrase, many chains. Your EVM address appears once you've saved your
            12-word phrase. You alone hold the keys — write it down and never share it.
          </div>
        </>
      )}
    </div>
  );

  const renderUpdates = () => (
    <div className="page">
      <h2 className="page-title glow-text-cyan">SYSTEM UPDATES</h2>
      <p className="page-desc">Live deployment log from the autonomous AI agent.</p>
      <div className="commit-list">
        {commits.map(c => (
          <a key={c.sha} href={c.html_url} target="_blank" rel="noopener noreferrer" className="commit-card">
            <div className="commit-header">
              <span className="commit-sha">{c.sha.slice(0, 7)}</span>
              <span className="commit-date">{new Date(c.commit.author?.date).toLocaleString()}</span>
            </div>
            <div className="commit-msg">{c.commit.message.split('\n')[0]}</div>
            <div className="commit-author">{c.commit.author?.name}</div>
          </a>
        ))}
        {commits.length === 0 && (
           <div className="panel" style={{textAlign: 'center', padding: 40}}>
             <span className="blink-cursor" style={{marginRight: 8}} /> Fetching commit logs...
           </div>
        )}
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="page">
      <h2 className="page-title glow-text-magenta">DIAGNOSTIC LOGS</h2>
      <p className="page-desc">Real-time system events and agent thoughts.</p>
      <div className="logs-terminal">
        {logs.length === 0 ? (
          <div style={{color: 'var(--text-3)', textAlign: 'center', padding: 40}}>
             <span className="blink-cursor" style={{marginRight: 8}} /> Awaiting telemetry stream...
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="log-line">
              <span className="time">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="tag" style={{ color: log.type === 'error' ? 'var(--red)' : log.type === 'system' ? 'var(--magenta)' : 'var(--cyan)' }}>
                [{log.type.toUpperCase()}]
              </span>
              <span>{log.content}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="win-title">
          <Logo />
          <span className="win-name font-display glow-text-chrome">ANSEM CHAIN</span>
        </div>
        
        {!isMobile && (
          <div className="chain-stats">
            <div className="cs">
              <span>HEIGHT:</span> <b className="glow-text-yellow">{blockHeight.toLocaleString()}</b>
            </div>
            <div className="cs">
              <span>TPS:</span> <b className="glow-text-cyan">{chainLive ? stats.tps : chain.tps}</b>
            </div>
            <div className="cs">
              <span>NET:</span> <b className="glow-text-green">MAINNET</b>
            </div>
            <div className={`live-dot ${chainLive ? '' : 'offline'}`} title={chainLive ? 'Live' : 'Simulated'} />
          </div>
        )}

        <div className="top-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`top-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'updates' && commitCount !== null && (
                <span className="commit-count-badge">{commitCount + chain.featuresShipped}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="app-body">
        <main className="app-content">
          <div className="app-bg-glow" />
          <div className="content-scroll">
            {activeTab === 'terminal' && renderTerminal()}
            {activeTab === 'molt' && renderChat()}
            {activeTab === 'explorer' && <BlockExplorer />}
            {activeTab === 'faucet' && renderFaucet()}
            {activeTab === 'wallet' && renderWallet()}
            {activeTab === 'updates' && renderUpdates()}
            {activeTab === 'logs' && renderLogs()}
            {activeTab === 'docs' && <Docs />}
            {activeTab === 'admin' && <AdminDashboard />}
          </div>
        </main>
        
        {!isMobile && agentPanelOpen && (
          <AgentTerminal />
        )}
      </div>

      <footer className="util-bar">
        <div className="util-left">
          <span className="util-label">UTILITIES:</span>
          <button className="util-btn" onClick={() => handleTab('faucet')}><span className="dia">◆</span> FAUCET</button>
          <button className="util-btn" onClick={() => handleTab('wallet')}><span className="dia">▸</span> SEND</button>
          {!isMobile && (
            <button className={`util-btn ${agentPanelOpen ? 'on' : ''}`} onClick={() => setAgentPanelOpen(!agentPanelOpen)}>■ AGENT</button>
          )}
          <a className="util-btn" href={REPO_URL} target="_blank" rel="noopener noreferrer">GITHUB</a>
          <a className="util-btn" href="https://x.com/BlackBull_Chain" target="_blank" rel="noopener noreferrer">𝕏 TWITTER</a>
        </div>
        <div className="util-right">
          {!isMobile && (
            <span className="contract" onClick={() => navigator.clipboard.writeText(CONTRACT_ADDRESS)} title="Click to copy">
              CA: {CONTRACT_ADDRESS}
            </span>
          )}
          <span className="util-balance">Balance: 10.5000 ANSEMCHAIN | Gas: 4.6 Gwei</span>
        </div>
      </footer>

      {showSeedModal && solSeedPhrase && (
        <div className="seed-overlay" role="dialog" aria-modal="true" aria-label="Secret recovery phrase">
          <div className="seed-modal">
            <div className="seed-modal-bar" />
            <div className="seed-modal-head">
              <span className="glow-text-yellow">[!] SECRET RECOVERY PHRASE</span>
              <span className="seed-timer">{fmtCountdown(seedCountdown)}</span>
            </div>
            <p className="seed-warn">
              Write these 12 words down in order and store them offline. Anyone with this phrase has
              full control of your funds. It will not be shown again after you close this window.
            </p>
            <div className="seed-grid">
              {solSeedPhrase.split(' ').map((word, i) => (
                <div className="seed-word" key={i}>
                  <span className="seed-word-idx">{i + 1}</span>
                  <span className="seed-word-text">{word}</span>
                </div>
              ))}
            </div>
            <div className="seed-actions-row">
              <button className="btn-ghost" onClick={() => copyText(solSeedPhrase, 'seed')}>
                {copiedField === 'seed' ? 'COPIED' : 'COPY PHRASE'}
              </button>
            </div>
            <label className="seed-ack">
              <input
                type="checkbox"
                checked={seedAck}
                onChange={e => setSeedAck(e.target.checked)}
              />
              <span>I have written down my 12-word recovery phrase and stored it safely.</span>
            </label>
            <button
              className="btn-primary"
              disabled={!seedAck}
              onClick={() => setShowSeedModal(false)}
              style={{ width: '100%' }}
            >
              {seedAck ? 'CLOSE' : seedCountdown > 0 ? `TAKE YOUR TIME · ${fmtCountdown(seedCountdown)}` : 'CONFIRM TO CLOSE'}
            </button>
            <div className="seed-hint">
              Take at least 2 minutes to record it. Finished early? Check the box above to close now.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
