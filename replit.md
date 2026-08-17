# Ansem Chain

Ansem Chain is a blockchain/AI-themed terminal-dashboard web app — a CRT synthwave interface that visualizes an autonomous LLM building its own blockchain in real time (agents, block explorer, faucet, wallet, CIP governance, live debates).

## Run & Operate

- App runs via the Replit web workflow (Vite dev server). Do NOT run `pnpm dev` at the workspace root.
- `pnpm --filter @workspace/ansemchain run typecheck` — typecheck the web artifact
- `pnpm --filter @workspace/ansemchain run build` — production build (Vite/esbuild, no tsc gate)
- `pnpm --filter @workspace/api-server run dev` — run the (currently minimal) API server

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web app: Vite 7 + React 18 (`@workspace/ansemchain`)
- API: Express 5 (`@workspace/api-server`) — scaffold only, not wired to the frontend
- Styling: plain hand-written CSS (`src/index.css`), no Tailwind directives despite the scaffold's `tailwindcss()` vite plugin being present (harmless no-op)

## Where things live

- `@workspace/ansemchain` `src/` — the entire frontend. Entry `main.tsx` renders `App` or `NetworkApp` based on the `network.` subdomain hostname.
- `src/index.css` — full theme (CRT synthwave palette, fonts, all component styling)
- `public/fonts/` — self-hosted Departure Mono bitmap font
- `src/agentSim.ts`, `ascii.ts`, `commits.ts` — client-side simulation data/logic

## Architecture decisions

- Migrated from a Vercel deploy that was already Vite + React (NOT Next.js). The large `backend/` dir in the original was a separate Railway/Docker service and was intentionally not ported.
- Frontend degrades gracefully with no backend: `API_BASE` is empty in production, and every API call has a client-side simulation fallback, so the app is fully functional standalone.
- Dead components from the original tree (`WalletConnect`, `MultiWalletConnect`, `PhantomWalletConnect`, `ByzantineDebateViewer`) are kept but not imported anywhere — preserved for parity, not wired in.

## Product

Terminal-style dashboard with tabs: Terminal (agent stream + tx pool + network map), Agents, Explorer, Faucet, Wallet, Updates, Logs, Admin. Wallet integrations use MetaMask (`@metamask/detect-provider`) and Solana (`@solana/web3.js`).

## User preferences

_Populate as you build._

## Gotchas

- The app runs only via the workflow (needs `PORT` + `BASE_PATH` env). Root-level `pnpm dev` does not exist.
- Strict typecheck is not clean (copied-in code) — this is expected and out of scope; the app builds and runs via esbuild regardless.
- The web app package (`@workspace/ansemchain`) lives in a folder whose on-disk name and Replit artifact id differ from the package name. This mismatch is intentional — see agent memory (`artifact-folder-rename-lock`) before ever trying to "fix" it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
