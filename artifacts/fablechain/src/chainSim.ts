// Shared "chain world" simulation — the single source of truth for the
// client-side simulated blockchain. One module-level state object advances on a
// single 1s interval and is consumed everywhere (terminal metrics, header,
// block explorer, admin) via the useChainSim() hook, so every surface shows a
// consistent, continuously-growing chain even with no backend.
//
// The agent stream (agentSim) is wired in: when the autonomous agent "ships" a
// feature (git_deploy), the world reacts — features-shipped ticks up, a fresh
// commit is recorded, and the chain nudges forward. Growth you can watch.
import { useSyncExternalStore } from 'react';
import { subscribeAgentSim } from './agentSim';

export interface SimBlock {
  height: number;
  hash: string;
  parentHash: string;
  producer: string;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
  stateRoot: string;
  summary: string;
  fresh: boolean;
}

export interface SimTx {
  hash: string;
  blockHeight: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  fee: string;
  status: string;
  timestamp: number;
  fresh: boolean;
}

export interface ChainCommit {
  hash: string;
  message: string;
  ts: number;
}

export interface ChainSnapshot {
  blockHeight: number;
  totalTransactions: number;
  tps: number;
  peers: number;
  gas: number;
  mempool: number;
  avgBlockTime: number;
  uptimeSec: number;
  featuresShipped: number;
  blocks: SimBlock[];
  txs: SimTx[];
  lastCommit: ChainCommit | null;
}

const GENESIS_TIMESTAMP = 1769731200000;
const MAX_FEED = 24;

const SUMMARIES = [
  'Agent collaborated on DeFi strategy optimization.',
  'Oracle update: ETH/USD volatility spike detected.',
  'Smart contract audited by AI layer. No issues.',
  'DAO proposal executed. Treasury allocated 5,000 ANSEMCHAIN.',
  'New knowledge fragment stored on-chain.',
  'Consensus round finalized in 312ms.',
  'Both nodes reached quorum. Block sealed.',
  'Anomaly scan complete. Zero threats found.',
  'Inference batch settled. 4,096 tokens notarized.',
  'Memory pool compacted. Latency improved 8%.',
  'Fee-weighted mempool eviction reclaimed 1.2MB.',
  'Merkle root verified across 3 shards.',
  'Proof-of-intelligence round scheduled and settled.',
  'Peer scoring rebalanced the gossip topology.',
  'Snapshot sync served a fresh node in 4.1s.',
  'Agent reputation ledger updated on-chain.',
];

const hex = (n: number) =>
  Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const addr = () => `0x${hex(4).toUpperCase()}...${hex(4).toUpperCase()}`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const makeBlock = (height: number, txCount: number, timestamp: number, fresh: boolean): SimBlock => ({
  height,
  hash: `0x${hex(64)}`,
  parentHash: `0x${hex(64)}`,
  producer: `ANSEM-NODE-${hex(3).toUpperCase()}`,
  timestamp,
  transactionCount: txCount,
  gasUsed: (1_000_000 + Math.floor(Math.random() * 5_000_000)).toString(),
  gasLimit: '8000000',
  stateRoot: `0x${hex(64)}`,
  summary: pick(SUMMARIES),
  fresh,
});

const makeTx = (blockHeight: number, fresh: boolean): SimTx => ({
  hash: `0x${hex(64)}`,
  blockHeight,
  from: addr(),
  to: addr(),
  value: (Math.random() * 1200 + 1).toFixed(2),
  gasPrice: (0.00001 + Math.random() * 0.00003).toFixed(5),
  fee: (0.00005 + Math.random() * 0.0004).toFixed(5),
  status: 'success',
  timestamp: Date.now(),
  fresh,
});

const START_HEIGHT = 118281;
const START_TXNS = 2459201;

interface InternalState {
  blockHeight: number;
  totalTransactions: number;
  tps: number;
  tpsTarget: number;
  peers: number;
  gas: number;
  mempool: number;
  avgBlockTime: number;
  uptimeSec: number;
  featuresShipped: number;
  nextBlockIn: number;
  lastBlockAt: number;
  blocks: SimBlock[];
  txs: SimTx[];
  lastCommit: ChainCommit | null;
}

const seedBlocks = (): SimBlock[] =>
  Array.from({ length: 8 }, (_, i) =>
    makeBlock(START_HEIGHT - i, 280 + Math.floor(Math.random() * 360), Date.now() - i * 11000, false),
  );

const seedTxs = (): SimTx[] =>
  Array.from({ length: 8 }, (_, i) => {
    const t = makeTx(START_HEIGHT - Math.floor(i / 3), false);
    t.timestamp = Date.now() - i * 4000;
    return t;
  });

const state: InternalState = {
  blockHeight: START_HEIGHT,
  totalTransactions: START_TXNS,
  tps: 42.5,
  tpsTarget: 42.5,
  peers: 12,
  gas: 0.00042,
  mempool: 256,
  avgBlockTime: 11,
  uptimeSec: Math.max(0, Math.floor((Date.now() - GENESIS_TIMESTAMP) / 1000)),
  featuresShipped: 0,
  nextBlockIn: 9,
  lastBlockAt: Date.now(),
  blocks: seedBlocks(),
  txs: seedTxs(),
  lastCommit: null,
};

const buildSnapshot = (): ChainSnapshot => ({
  blockHeight: state.blockHeight,
  totalTransactions: state.totalTransactions,
  tps: Math.round(state.tps * 10) / 10,
  peers: state.peers,
  gas: state.gas,
  mempool: state.mempool,
  avgBlockTime: state.avgBlockTime,
  uptimeSec: state.uptimeSec,
  featuresShipped: state.featuresShipped,
  blocks: state.blocks,
  txs: state.txs,
  lastCommit: state.lastCommit,
});

let snapshot: ChainSnapshot = buildSnapshot();
const listeners = new Set<() => void>();

const notify = () => {
  snapshot = buildSnapshot();
  listeners.forEach((l) => l());
};

const tick = () => {
  state.uptimeSec = Math.max(0, Math.floor((Date.now() - GENESIS_TIMESTAMP) / 1000));

  if (Math.random() < 0.2) state.gas = 0.00038 + Math.random() * 0.00014;
  if (Math.random() < 0.25) {
    state.peers = clamp(state.peers + (Math.random() < 0.5 ? -1 : 1), 8, 19);
  }

  // Clear "fresh" highlight from the previous tick before adding new items.
  state.blocks = state.blocks.map((b) => (b.fresh ? { ...b, fresh: false } : b));
  state.txs = state.txs.map((t) => (t.fresh ? { ...t, fresh: false } : t));

  // Incoming transactions accumulate in the mempool.
  const incoming = 6 + Math.floor(Math.random() * 20);
  state.mempool += incoming;

  // Surface a few pending transactions in the live feed.
  if (Math.random() < 0.6) {
    const add = 1 + Math.floor(Math.random() * 3);
    const fresh: SimTx[] = Array.from({ length: add }, () => makeTx(state.blockHeight + 1, true));
    state.txs = [...fresh, ...state.txs].slice(0, MAX_FEED);
  }

  // Block production.
  state.nextBlockIn -= 1;
  if (state.nextBlockIn <= 0) {
    const now = Date.now();
    const interval = clamp((now - state.lastBlockAt) / 1000, 4, 40);
    state.lastBlockAt = now;
    state.avgBlockTime = Math.round((state.avgBlockTime * 3 + interval) / 4);

    const txCount = Math.min(state.mempool, 280 + Math.floor(Math.random() * 360));
    state.mempool = Math.max(20, state.mempool - txCount);
    state.blockHeight += 1;
    state.totalTransactions += txCount;
    state.blocks = [makeBlock(state.blockHeight, txCount, now, true), ...state.blocks].slice(0, MAX_FEED);
    state.tpsTarget = txCount / interval;
    state.nextBlockIn = 8 + Math.floor(Math.random() * 9);
  }

  // Ease TPS toward its target with a little noise so it always wiggles, never 0.
  state.tps += (state.tpsTarget - state.tps) * 0.12 + (Math.random() - 0.5) * 0.8;
  if (state.tps < 1) state.tps = 1 + Math.random();

  notify();
};

let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

const ensureStarted = () => {
  if (started) return;
  started = true;
  state.lastBlockAt = Date.now();
  intervalId = setInterval(tick, 1000);

  // Connect agent completions to visible chain growth. Shipping a feature bumps
  // the features-shipped counter, records the commit, and nudges the chain.
  subscribeAgentSim((evt) => {
    if (evt.type === 'git_deploy') {
      state.featuresShipped += 1;
      state.lastCommit = { hash: evt.data.commit, message: evt.data.message, ts: Date.now() };
      state.blockHeight += 1 + Math.floor(Math.random() * 2);
      state.mempool = Math.max(20, state.mempool - 40);
      notify();
    }
  });
};

const subscribe = (cb: () => void) => {
  ensureStarted();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => snapshot;

export function getChainSnapshot(): ChainSnapshot {
  return snapshot;
}

export function useChainSim(): ChainSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Keep the interval reference reachable (avoids unused-var lint; lets a future
// teardown clear it if ever needed).
export function _stopChainSim(): void {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  started = false;
}
