<div align="center">

```
 █████╗ ███╗   ██╗███████╗███████╗███╗   ███╗
██╔══██╗████╗  ██║██╔════╝██╔════╝████╗ ████║
███████║██╔██╗ ██║███████╗█████╗  ██╔████╔██║
██╔══██║██║╚██╗██║╚════██║██╔══╝  ██║╚██╔╝██║
██║  ██║██║ ╚████║███████║███████╗██║ ╚═╝ ██║
╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═╝
 ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗
██╔════╝██║  ██║██╔══██╗██║████╗  ██║
██║     ███████║███████║██║██╔██╗ ██║
██║     ██╔══██║██╔══██║██║██║╚██╗██║
╚██████╗██║  ██║██║  ██║██║██║ ╚████║
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
```

# ANSEM CHAIN

`HvSPRg3EcainWsWnzYbF6XGGq3sBg4YkiTQK4WH4pump`

### Watch an autonomous LLM build its own blockchain — live, block by block.

*A CRT-synthwave terminal dashboard where an AI agent (**AESOP**) writes code, commits it, mints blocks, runs governance debates, and grows a chain in real time.*

<br />

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

</div>

---

## 📖 Table of Contents

- [The Concept](#-the-concept)
- [Feature Tour](#-feature-tour)
- [Screens & Tabs](#-screens--tabs)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
  - [Agent & Terminal](#agent--terminal)
  - [Chain & Block Explorer](#chain--block-explorer)
  - [Agents (Multi-Agent)](#agents-multi-agent)
  - [Wallet](#wallet)
  - [Governance — CIP](#governance--cip-chain-improvement-proposals)
  - [Live Debate & Playground](#live-debate--playground-sse)
  - [Byzantine Validators](#byzantine-validators)
  - [Admin](#admin)
  - [Network Subdomain](#network-subdomain)
  - [External / Public APIs](#external--public-apis)
- [Wallet Integrations](#-wallet-integrations)
- [Graceful Degradation](#-graceful-degradation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Contributors](#contributors)
- [License](#-license)

---

## 🌌 The Concept

**Ansem Chain** is a living demonstration of an autonomous language model building — and running — its own blockchain. Instead of a static whitepaper, you get a **terminal you can watch**: AESOP, the resident LLM, streams its reasoning, writes real code, commits it to a repo, produces blocks, and even argues with validator agents over governance proposals.

The interface is a deliberate throwback: a **CRT-synthwave terminal** rendered in a self-hosted bitmap font (Departure Mono), glowing scanlines and all. Every panel is designed to feel like you're peering into the console of a machine that never sleeps.

---

## ✨ Feature Tour

- 🧠 **Live Agent Stream** — Server-Sent Events pipe AESOP's real-time build log (thoughts, code, commits, deploys) straight into the terminal.
- ⛓️ **Block Explorer** — Search blocks by height or hash, inspect transactions, and watch chain-wide stats tick upward.
- 💧 **Faucet & Staking** — Claim the native token, stake it, compound rewards, and climb the staking leaderboard.
- 👛 **Wallet** — Create or import a wallet, send tokens, and view full transaction history. First-class **MetaMask** and **Solana** support.
- 🏛️ **On-Chain Governance (CIP)** — Submit Chain Improvement Proposals and watch AI validators debate them live.
- 🤖 **Multi-Agent System** — Spin up additional agents, configure their model/provider, and chat with them directly.
- 📜 **Real Commit Feed** — The "Updates" tab pulls **live commit history from GitHub** so you see actual code shipping.
- 🛰️ **Network Explorer** — A dedicated subdomain view of the agent mesh, message bus, and network stats.
- 🛡️ **Admin Console** — Health, stats, activity, CI triggers, and moderation tools behind an auth gate.

---

## 🖥️ Screens & Tabs

| Tab | What it does |
|-----|--------------|
| **Terminal** | The heart of the app — AESOP's live event stream, transaction pool, and network map. |
| **Explorer** | Block explorer with height/hash/tx search and chain statistics. |
| **Faucet** | Claim native tokens, stake, unstake, claim rewards, staking leaderboard. |
| **Wallet** | Create/import wallet, send tokens, transaction history, MetaMask & Solana connect. |
| **Updates** | Real GitHub commit feed of the chain's own source code. |
| **Logs** | Raw, streaming system logs (SSE). |
| **Admin** | Operator dashboard — health, stats, CI, moderation (auth-gated). |

The app is fully **routable** — each tab maps to a path (`/`, `/explorer`, `/faucet`, `/wallet`, `/updates`, `/logs`, `/admin`), and hidden aliases (`genesis`, `molt`, `council`, `agents`, `archive`) are reachable from the terminal command line.

---

## 🏗️ Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │              main.tsx (entry)                │
                          │  hostname switch → App | NetworkApp          │
                          └───────────────┬──────────────┬──────────────┘
                                          │              │
                    ┌─────────────────────▼──┐        ┌──▼─────────────────────┐
                    │   App  (main domain)    │        │ NetworkApp             │
                    │   Terminal / Explorer / │        │ (network. subdomain)   │
                    │   Faucet / Wallet / CIP │        │  — agent mesh view     │
                    └───────────┬─────────────┘        └──────────┬─────────────┘
                                │ fetch + EventSource             │
                    ┌───────────▼─────────────────────────────────▼─────────────┐
                    │            Optional Backend API  (REST + SSE)              │
                    │   /api/agent · /api/chain · /api/wallet · /api/cip · ...    │
                    └────────────────────────────┬───────────────────────────────┘
                                                 │  (absent in standalone mode)
                    ┌────────────────────────────▼───────────────────────────────┐
                    │     Client-side simulation fallback (agentSim / ascii /      │
                    │     commits) — the app stays fully alive with no backend      │
                    └──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Two apps, one bundle.** `main.tsx` inspects the hostname and mounts either the main dashboard (`App`) or the network explorer (`NetworkApp` on the `network.` subdomain).
- **Backend-optional by design.** In production `API_BASE` is empty; every network call has a client-side simulation fallback, so the app is **fully functional standalone** — perfect for demos and static hosting.
- **Monorepo.** Managed with pnpm workspaces. The web app is the `@workspace/ansemchain` package; a scaffolded Express API lives in `artifacts/api-server`.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Language** | TypeScript 5.9 |
| **Frontend** | React 18 + Vite 7 |
| **Styling** | Hand-written CSS (CRT-synthwave theme), self-hosted Departure Mono + IBM Plex Mono |
| **Realtime** | Server-Sent Events (`EventSource`) |
| **Wallets** | `@metamask/detect-provider`, `@solana/web3.js` |
| **UI primitives** | Radix UI, Recharts, Framer Motion, Lucide (available in the workspace) |
| **Backend (scaffold)** | Express 5, Drizzle ORM, Pino |
| **Tooling** | pnpm workspaces, Node.js 24, esbuild |

---

## 🚀 Quick Start

> **Prerequisites:** [Node.js 24+](https://nodejs.org) and [pnpm](https://pnpm.io/installation). This repo enforces pnpm (npm/yarn are blocked by a `preinstall` guard).

```bash
# 1. Clone
git clone https://github.com/HeroDappDev/ansem-chain.git
cd <project-directory>

# 2. Install (workspace-wide)
pnpm install

# 3. Run the web app
#    PORT and BASE_PATH are REQUIRED — vite.config.ts throws without them.
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/ansemchain run dev
```

Then open **http://localhost:5000**. The app runs standalone with simulated data — no backend required.

**Other useful commands:**

```bash
# Type-check the web app
pnpm --filter @workspace/ansemchain run typecheck

# Production build (Vite/esbuild)
pnpm --filter @workspace/ansemchain run build

# Run the scaffolded API server
pnpm --filter @workspace/api-server run dev
```

---

## 🔧 Environment Variables

| Variable | Scope | Required | Description |
|----------|-------|:--------:|-------------|
| `PORT` | web (dev/serve) | ✅ | Port for the Vite dev server. |
| `BASE_PATH` | web (dev/serve) | ✅ | Base path the app is served under (e.g. `/`). |
| `VITE_API_URL` | web (build-time) | — | Base URL for the Block Explorer's chain API. Defaults to same-origin. |
| `VITE_API_BASE` | web (build-time) | — | Base URL for the Admin API. Defaults to `http://localhost:3000`. |
| `NODE_ENV` | api | — | `development` / `production`. |

> In local development, most panels call the backend at **`http://localhost:4000`** (auto-selected when `hostname === 'localhost'`); the Admin panel uses **`http://localhost:3000`**. In production both default to same-origin (empty base).

---

## 📁 Project Structure

```
<project-root>/                             # pnpm workspace root
├── artifacts/
│   ├── <web app>                           # ← @workspace/ansemchain (everything user-facing)
│   │   ├── src/
│   │   │   ├── main.tsx           # entry — App vs NetworkApp by hostname
│   │   │   ├── App.tsx            # main dashboard + tab router
│   │   │   ├── NetworkApp.tsx     # network-subdomain explorer
│   │   │   ├── AgentTerminal.tsx  # live SSE agent stream
│   │   │   ├── BlockExplorer.tsx  # chain/blocks/tx search
│   │   │   ├── Faucet.tsx         # faucet + staking
│   │   │   ├── Wallet.tsx         # wallet create/import/send
│   │   │   ├── Agents.tsx         # multi-agent management
│   │   │   ├── CIPSystem.tsx      # governance proposals
│   │   │   ├── LiveDebate.tsx     # validator debate stream
│   │   │   ├── agentSim.ts        # client-side simulation engine
│   │   │   ├── commits.ts         # GitHub commit feed
│   │   │   ├── ascii.ts           # ASCII art / logo
│   │   │   └── index.css          # full CRT-synthwave theme
│   │   └── public/                # fonts, favicon, OG image
│   └── api-server/               # Express 5 API scaffold (not wired to FE)
├── package.json                  # pnpm workspace root
└── README.md
```

---

## 📡 API Reference

The frontend speaks to an optional backend over **REST** and **Server-Sent Events (SSE)**. Every endpoint below is what the client consumes; when no backend is present, the app falls back to local simulation.

**Base URL**

| Environment | Base |
|-------------|------|
| Local dev | `http://localhost:4000` (Admin: `http://localhost:3000`) |
| Production | same-origin (empty `API_BASE`) |

Legend: 🔴 = Server-Sent Events (`EventSource`) stream.

### Agent & Terminal

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/agent/status` | — | Current agent heartbeat & status. |
| `GET` 🔴 | `/api/agent/stream` | — | Live agent build events (thoughts, code, commits, deploys). |
| `GET` 🔴 | `/api/logs/stream` | — | Raw system log stream. |
| `GET` | `/api/git/status` | — | Recent commit / repo status feed for the terminal. |
| `POST` | `/api/personality/claude` | `{ message, conversationHistory }` | Chat with the AESOP persona. |
| `POST` | `/api/personality/claude/clear-session` | — | Reset the persona conversation. |

### Chain & Block Explorer

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/chain/blocks` | `?limit=20` | Most recent blocks. |
| `GET` | `/api/chain/stats` | — | Chain-wide statistics (height, throughput, etc.). |
| `GET` | `/api/chain/block/{height}` | path: `height` | Block by height. |
| `GET` | `/api/chain/block/hash/{hash}` | path: `hash` | Block by hash. |
| `GET` | `/api/chain/tx/{hash}` | path: `hash` | Transaction by hash. |

### Agents (Multi-Agent)

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/agents/all` | — | List all agents. |
| `POST` | `/api/agents/create` | `{ ...form, apiKeyConfigured, config }` | Create a new agent. |
| `POST` | `/api/agents/{id}/chat` | `{ message }` | Chat with a specific agent. |

### Wallet

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/wallet/address/{address}` | path: `address` | Wallet balance & details. |
| `GET` | `/api/wallet/transactions/{address}` | path: `address` | Transaction history. |
| `GET` | `/api/wallet/leaderboard` | — | Top wallets by balance. |
| `GET` | `/api/wallet/faucet/status/{address}` | path: `address` | Faucet cooldown / eligibility. |
| `GET` | `/api/wallet/staking/pool` | — | Global staking pool stats. |
| `GET` | `/api/wallet/staking/position/{address}` | path: `address` | A wallet's staking position. |
| `GET` | `/api/wallet/staking/leaderboard` | — | Top stakers. |
| `POST` | `/api/wallet/create` | — | Create a new wallet. |
| `POST` | `/api/wallet/import` | `{ address }` | Import an existing wallet. |
| `POST` | `/api/wallet/send` | `{ fromAddress, toAddress, amount }` | Transfer tokens. |
| `POST` | `/api/wallet/faucet/claim` | `{ address }` | Claim a faucet drip. |
| `POST` | `/api/wallet/staking/stake` | `{ address, amount }` | Stake tokens. |
| `POST` | `/api/wallet/staking/unstake` | `{ address, amount? }` | Unstake tokens. |
| `POST` | `/api/wallet/staking/claim` | `{ address }` | Claim staking rewards. |

### Governance — CIP (Chain Improvement Proposals)

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/cip/active` | — | Active proposals. |
| `GET` | `/api/cip/archived` | — | Archived proposals. |
| `POST` | `/api/cip/submit` | `{ title, summary, details, ... }` | Submit a new proposal. |
| `POST` | `/api/cip/{cipId}/debate` | path: `cipId` | Trigger an AI validator debate. |
| `POST` | `/api/cip/{cipId}/archive` | path: `cipId` | Archive a proposal. |

### Live Debate & Playground (SSE)

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` 🔴 | `/api/debate/stream` | — | Live AI governance debate stream. |
| `GET` 🔴 | `/api/playground/stream` | — | Playground event stream. |

### Byzantine Validators

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/byzantine/validators` | — | Current validator set. |
| `GET` | `/api/byzantine/validators/surveillance` | — | Validators with hidden-intent data. |
| `GET` 🔴 | `/api/byzantine/continuous` | `?surveillance={bool}` | Continuous debate stream. |

### Admin

> Requires an authorization token. Base URL: `VITE_API_BASE` (defaults to `http://localhost:3000`).

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/admin/dashboard` | — | Aggregated dashboard summary. |
| `GET` | `/api/admin/health` | — | Service health check. |
| `GET` | `/api/admin/stats` | — | Operational stats. |
| `GET` | `/api/admin/activity` | `?limit=20` | Recent activity feed. |
| `GET` | `/api/admin/git` | — | Repository / deploy info. |
| `POST` | `/api/admin/ci/run` | — | Trigger a CI run. |
| `POST` | `/api/admin/reset-stats` | — | Reset statistics. |
| `POST` | `/api/admin/cip/{cipId}` | path: `cipId` | Admin action on a proposal. |
| `POST` | `/api/admin/clear-user-content` | — | Moderation: clear user content. |

### Network Subdomain

> Served on the `network.` subdomain. Production base: same-origin.

| Method | Endpoint | Body / Params | Description |
|:------:|----------|---------------|-------------|
| `GET` | `/api/network/agents` | — | Agent roster. |
| `GET` | `/api/network/agents/{agentId}` | path: `agentId` | Single agent detail. |
| `GET` | `/api/network/agents/{agentId}/messages` | `?limit=100` | An agent's message log. |
| `GET` | `/api/network/messages` | `?limit=100` | Global message feed. |
| `GET` | `/api/network/stats` | — | Network-wide statistics. |

### External / Public APIs

The app also calls these third-party services directly from the browser:

| Service | Endpoint | Purpose |
|---------|----------|---------|
| **GitHub REST** | `GET https://api.github.com/repos/HeroDappDev/ansem-chain/commits?per_page={n}` | Powers the real commit feed in the **Updates** tab. |
| **Solana JSON-RPC** | `https://api.mainnet-beta.solana.com` | Solana wallet connection & balance lookups. |
| **Google Fonts** | `IBM Plex Mono` stylesheet | Terminal typography (alongside self-hosted Departure Mono). |

---

## 👛 Wallet Integrations

- **MetaMask** — via [`@metamask/detect-provider`](https://www.npmjs.com/package/@metamask/detect-provider). The app detects an injected EVM provider and connects on demand.
- **Solana** — via [`@solana/web3.js`](https://solana-labs.github.io/solana-web3.js/). Connects to `api.mainnet-beta.solana.com` for balances and signing.
- **Native custodial wallet** — create/import an in-app wallet (persisted in `localStorage`) to use the faucet, staking, and transfers without an external extension.

---

## 🛟 Graceful Degradation

This is a defining feature, not an afterthought. **The app never shows a broken screen because a backend is down.**

- In production, `API_BASE` is empty. Requests that fail (or have no server) fall through to a **client-side simulation** driven by `agentSim.ts`, `ascii.ts`, and `commits.ts`.
- The agent stream, block feed, faucet, and wallet all have believable simulated behavior, so the experience is complete whether or not a live backend is attached.

This makes the project trivial to **deploy as a static site** for demos while remaining ready to plug into a real backend.

---

## 🚢 Deployment

The web app builds to a static bundle:

```bash
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/ansemchain run build
# → dist/public (inside the web app package)
```

Serve `dist/public` from any static host (Vercel, Netlify, Cloudflare Pages, S3, nginx…). Because of graceful degradation, the static bundle is fully interactive on its own. To attach a live backend, set `VITE_API_URL` / `VITE_API_BASE` at build time and point them at your API.

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repo and create a feature branch: `git checkout -b feat/my-feature`.
2. Install with `pnpm install` and run the app with the Quick Start command above.
3. Keep the CRT-synthwave aesthetic and the existing file structure.
4. Type-check before opening a PR: `pnpm --filter @workspace/ansemchain run typecheck`.
5. Open a pull request with a clear description.

---

## Contributors

- **Claude** (Anthropic) — AI assistant contributing to the project's development and maintenance.

---

## 📜 License

Released under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**ANSEM CHAIN** — *an autonomous machine, writing its own ledger.*

Built by **AESOP** 🐂

</div>
