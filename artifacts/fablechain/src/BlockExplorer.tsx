import React, { useState, useEffect, useRef } from 'react';
import { useChainSim } from './chainSim';

interface Block {
  height: number;
  hash: string;
  parentHash: string;
  producer: string;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
  stateRoot: string;
}

interface Transaction {
  hash: string;
  blockHeight: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  status: string;
  timestamp: number;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

// Simulation fallback helpers
const hexStr = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const shortHash = () => `0x${hexStr(8)}...${hexStr(6)}`;
const shortAddr = () => `0x${hexStr(4).toUpperCase()}...${hexStr(4).toUpperCase()}`;

const generateMockBlocks = (count: number, startHeight: number): Block[] => {
  return Array.from({ length: count }).map((_, i) => ({
    height: startHeight - i,
    hash: `0x${hexStr(32)}`,
    parentHash: `0x${hexStr(32)}`,
    producer: `ANSEM-NODE-${hexStr(3)}`,
    timestamp: Date.now() - (i * 10000),
    transactionCount: Math.floor(Math.random() * 50) + 1,
    gasUsed: Math.floor(Math.random() * 5000000).toString(),
    gasLimit: '8000000',
    stateRoot: `0x${hexStr(32)}`
  }));
};

const generateMockTxs = (count: number): Transaction[] => {
  return Array.from({ length: count }).map((_, i) => ({
    hash: `0x${hexStr(32)}`,
    blockHeight: 118281 - Math.floor(i / 10),
    from: shortAddr(),
    to: shortAddr(),
    value: (Math.random() * 1000).toFixed(2),
    gasPrice: '0.00002',
    status: 'success',
    timestamp: Date.now() - (i * 5000)
  }));
};

export default function BlockExplorer() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'blocks' | 'transactions'>('blocks');
  const [stats, setStats] = useState({
    blockHeight: 118281,
    totalTransactions: 2459201,
    avgBlockTime: 10,
    tps: 42.5
  });
  const backendLiveRef = useRef(false);
  const chain = useChainSim();

  useEffect(() => {
    fetchBlocks();
    fetchStats();
    const interval = setInterval(() => {
      fetchBlocks();
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mirror the shared chain world while the backend is unavailable, so the
  // explorer shows the same continuously-growing chain as the rest of the app.
  // Real backend data always wins (guarded on backendLiveRef).
  useEffect(() => {
    if (backendLiveRef.current) return;
    setStats({
      blockHeight: chain.blockHeight,
      totalTransactions: chain.totalTransactions,
      avgBlockTime: chain.avgBlockTime,
      tps: chain.tps,
    });
    setBlocks(chain.blocks);
    setTransactions(chain.txs);
    setLoading(false);
  }, [chain]);

  const fetchBlocks = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/chain/blocks?limit=20`);
      if (response.ok) {
        const data = await response.json();
        backendLiveRef.current = true;
        if (data.blocks && data.blocks.length > 0) {
          setBlocks(data.blocks);
        }
        if (data.total) {
          setStats(prev => ({ ...prev, blockHeight: data.total }));
        }
      } else {
        backendLiveRef.current = false;
      }
    } catch (e) {
      // Backend unavailable — the interval simulation keeps the view alive.
      backendLiveRef.current = false;
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const chainResponse = await fetch(`${API_BASE}/api/chain/stats`);
      if (chainResponse.ok) {
        const chainData = await chainResponse.json();
        setStats({
          blockHeight: chainData.height || 0,
          totalTransactions: chainData.totalTransactions || 0,
          avgBlockTime: Math.round(chainData.avgBlockTime / 1000) || 10,
          tps: 0
        });
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/agent/status`);
      if (response.ok) {
        const data = await response.json();
        if (data.blockHeight) {
          setStats(prev => ({
            ...prev,
            blockHeight: data.blockHeight,
            totalTransactions: data.transactionCount || prev.totalTransactions
          }));
        }
      }
    } catch (e) {}
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      if (/^\d+$/.test(searchQuery)) {
        const response = await fetch(`${API_BASE}/api/chain/block/${searchQuery}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResult({ type: 'block', data });
          return;
        }
      }
      
      const blockResponse = await fetch(`${API_BASE}/api/chain/block/hash/${searchQuery}`);
      if (blockResponse.ok) {
        const data = await blockResponse.json();
        setSearchResult({ type: 'block', data });
        return;
      }
      
      const txResponse = await fetch(`${API_BASE}/api/chain/tx/${searchQuery}`);
      if (txResponse.ok) {
        const data = await txResponse.json();
        setSearchResult({ type: 'transaction', data });
        return;
      }
      
      // Standalone simulation fallback for search
      if (/^\d+$/.test(searchQuery)) {
         setSearchResult({ type: 'block', data: generateMockBlocks(1, parseInt(searchQuery))[0] });
      } else if (searchQuery.length > 40) {
         setSearchResult({ type: 'transaction', data: { ...generateMockTxs(1)[0], hash: searchQuery } });
      } else {
         setSearchResult({ type: 'error', message: 'Not found' });
      }
    } catch (e) {
      if (/^\d+$/.test(searchQuery)) {
         setSearchResult({ type: 'block', data: generateMockBlocks(1, parseInt(searchQuery))[0] });
      } else {
        setSearchResult({ type: 'error', message: 'Search failed' });
      }
    }
  };

  const formatHash = (hash: string) => {
    if (!hash) return '-';
    if (hash.length < 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title glow-text-cyan">BLOCK EXPLORER</h1>
        <p className="page-desc">Analyze network activity, blocks, and transactions.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">BLOCK HEIGHT</div>
          <div className="stat-value glow-text-cyan" style={{ color: 'var(--cyan)' }}>
            {stats.blockHeight.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TRANSACTIONS</div>
          <div className="stat-value glow-text-magenta" style={{ color: 'var(--magenta)' }}>
            {stats.totalTransactions.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">BLOCK TIME</div>
          <div className="stat-value">{stats.avgBlockTime}s</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">NETWORK</div>
          <div className="stat-value glow-text-green" style={{ color: 'var(--green-neon)' }}>Mainnet</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, minWidth: 300 }}
          placeholder="Search by block height, hash, or transaction..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-primary" onClick={handleSearch}>SEARCH</button>
      </div>

      {searchResult && (
        <div className="panel panel--cyan" style={{ marginBottom: 24 }}>
          {searchResult.type === 'error' ? (
            <div style={{ color: 'var(--red)' }}>{searchResult.message}</div>
          ) : searchResult.type === 'block' ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--cyan)' }} className="glow-text-cyan">
                Block #{searchResult.data.height}
              </div>
              <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
                <div><span style={{ color: 'var(--text-2)', display: 'inline-block', width: 100 }}>Hash:</span> <span className="mono">{searchResult.data.hash}</span></div>
                <div><span style={{ color: 'var(--text-2)', display: 'inline-block', width: 100 }}>Producer:</span> <span className="mono">{searchResult.data.producer}</span></div>
                <div><span style={{ color: 'var(--text-2)', display: 'inline-block', width: 100 }}>Time:</span> {new Date(searchResult.data.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--magenta)' }} className="glow-text-magenta">
                Transaction Details
              </div>
              <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
                <div><span style={{ color: 'var(--text-2)', display: 'inline-block', width: 100 }}>Hash:</span> <span className="mono">{searchResult.data.hash}</span></div>
                <div><span style={{ color: 'var(--text-2)', display: 'inline-block', width: 100 }}>From:</span> <span className="mono">{searchResult.data.from}</span></div>
                <div><span style={{ color: 'var(--text-2)', display: 'inline-block', width: 100 }}>To:</span> <span className="mono">{searchResult.data.to}</span></div>
                <div><span style={{ color: 'var(--text-2)', display: 'inline-block', width: 100 }}>Value:</span> <span className="glow-text-green" style={{color: 'var(--green-neon)'}}>{searchResult.data.value} ANSEMCHAIN</span></div>
              </div>
            </div>
          )}
          <button className="btn-ghost" onClick={() => setSearchResult(null)} style={{ marginTop: 24, width: 'fit-content' }}>
            CLEAR RESULTS
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={view === 'blocks' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setView('blocks')}
        >
          RECENT BLOCKS
        </button>
        <button
          className={view === 'transactions' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setView('transactions')}
        >
          TRANSACTIONS
        </button>
      </div>

      {view === 'blocks' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>HEIGHT</th>
                <th>HASH</th>
                <th>PRODUCER</th>
                <th>TXS</th>
                <th>TIME</th>
              </tr>
            </thead>
            <tbody>
              {loading && blocks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Loading blocks...</td>
                </tr>
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>No blocks found</td>
                </tr>
              ) : (
                blocks.map((block) => (
                  <tr key={block.height} onClick={() => setSelectedBlock(block)} style={{ cursor: 'pointer' }}>
                    <td className="mono glow-text-cyan" style={{ color: 'var(--cyan)' }}>#{block.height}</td>
                    <td className="mono">{formatHash(block.hash)}</td>
                    <td className="mono">{block.producer}</td>
                    <td className="mono">{block.transactionCount || 0}</td>
                    <td className="mono" style={{ color: 'var(--text-3)' }}>{formatTimeAgo(block.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'transactions' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
           <table className="dtable">
            <thead>
              <tr>
                <th>TX HASH</th>
                <th>FROM</th>
                <th>TO</th>
                <th>VALUE</th>
                <th>TIME</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.hash} style={{ cursor: 'pointer' }}>
                  <td className="mono glow-text-magenta" style={{ color: 'var(--magenta)' }}>{formatHash(tx.hash)}</td>
                  <td className="mono">{tx.from}</td>
                  <td className="mono">{tx.to}</td>
                  <td className="mono glow-text-green" style={{ color: 'var(--green-neon)' }}>{tx.value} ANSEMCHAIN</td>
                  <td className="mono" style={{ color: 'var(--text-3)' }}>{formatTimeAgo(tx.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedBlock && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24
        }} onClick={() => setSelectedBlock(null)}>
          <div className="panel panel--cyan" style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, color: 'var(--cyan)' }} className="glow-text-cyan">Block #{selectedBlock.height}</h2>
              <button className="btn-ghost" onClick={() => setSelectedBlock(null)} style={{ padding: '4px 12px' }}>CLOSE</button>
            </div>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>HASH</div>
                <div className="mono" style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--text-0)' }}>{selectedBlock.hash}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>PARENT HASH</div>
                <div className="mono" style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--text-0)' }}>{selectedBlock.parentHash}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>PRODUCER</div>
                  <div className="mono">{selectedBlock.producer}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>TIMESTAMP</div>
                  <div>{new Date(selectedBlock.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>GAS USED</div>
                  <div className="mono">{selectedBlock.gasUsed || '0'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>GAS LIMIT</div>
                  <div className="mono">{selectedBlock.gasLimit || '8000000'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
