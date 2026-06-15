# Roam®

> **Set your vibe. Sign once. Just roam.**

Roam is an autonomous travel agent that plans your day and pays for every stop — silently, on-chain, without you ever pulling out your wallet again.

Tell Roam your city, your vibe, and your budget. Sign one permission. Your AI agent builds a live itinerary and pays each stop using ERC-7710 delegation redemption via the 1Shot permissionless relayer on Base mainnet. Real USDC. Real transactions. Zero interruptions.

**Live demo:** [roam-jet-gamma.vercel.app](https://roam-jet-gamma.vercel.app)

---

## What's under the hood

| Layer | Technology |
|---|---|
| Permission grant | ERC-7715 via `@metamask/smart-accounts-kit` |
| Account upgrade | EIP-7702 — EOA → Smart Account (MetaMask Flask 13.9+) |
| Delegation redemption | ERC-7710 via 1Shot `relayer_send7710Transaction` |
| Gas payment | USDC on Base mainnet — no ETH required |
| Status updates | 1Shot webhooks (`destinationUrl`) — type 0/4/1 |
| Itinerary generation | AI agent — streaming SSE response |
| Chain | Base Mainnet (Chain ID 8453) |
| Frontend | Next.js 16, wagmi v3, viem v2, Tailwind CSS v4 |

---

## How it works

**1. Connect** — User connects MetaMask Flask on Base mainnet.

**2. Set preferences** — City, vibes (street food, live music, coffee…), budget in USDC, time window.

**3. Sign once** — `requestExecutionPermissions` from `@metamask/smart-accounts-kit` is called. MetaMask Flask 13.9+ atomically upgrades the EOA to a smart account (EIP-7702) and issues a signed ERC-7710 delegation scoped to the 1Shot target address, capped to the user's budget, expiring at their chosen end time. This is the only signature the user ever provides.

**4. Agent plans** — The AI agent streams a structured itinerary directly to the browser via SSE. 3–5 activities, each with a time, cost, and service endpoint.

**5. Payments fire automatically** — For each activity, `/api/pay` decodes the ERC-7710 delegation, prepends a USDC fee transfer to the 1Shot fee collector, and calls `relayer_send7710Transaction` on Base mainnet with a `destinationUrl` webhook. The relay returns a `taskId` immediately.

**6. Status updates** — The browser polls `/api/relay-status` every 3 seconds while the transaction settles. On production, 1Shot also POSTs to `/api/status` at each state change (type 4 = submitted, type 0 = confirmed, type 1 = failed) — used as the authoritative source of truth for payment status.

**7. Proof** — Every confirmed payment shows a Basescan link and a QR code. The downloadable itinerary includes the transaction hash per activity.

---

## Setup

### Prerequisites

- Node.js 18+
- MetaMask Flask 13.9+ (not regular MetaMask — Flask is required for ERC-7715 / EIP-7702)
- A wallet with USDC on Base mainnet

### Install

```bash
git clone https://github.com/OoviyaManickam/Roam.git
cd Roam
npm install
```

### Environment variables

Create `.env.local` in the project root:

```env
# AI agent
GROQ_API_KEY=your_groq_api_key

# Chain — Base mainnet
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# 1Shot — mainnet relayer
ONESHOT_RELAYER_URL=https://relayer.1shotapi.com/relayers

# App URL (use your Vercel URL when deployed)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** On localhost, 1Shot webhooks are unreachable (no public URL). The app automatically falls back to client-side polling of `/api/relay-status` every 3 seconds. Webhooks are fully active on the deployed Vercel URL.

### Deploy

Push to GitHub and import the repo on [vercel.com](https://vercel.com). Add all env vars from `.env.local` in the Vercel project settings, setting `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL. `vercel.json` already configures appropriate `maxDuration` for the streaming and payment routes.

---

## Project structure

```
src/
  app/
    page.tsx                  # Landing page
    onboarding/page.tsx       # Preferences + permission grant
    roam/page.tsx             # Live agent feed + payment timeline
    api/
      agent/route.ts          # AI agent — streams itinerary via SSE
      pay/route.ts            # Payment engine — builds + submits 7710 tx
      relay-status/route.ts   # Proxies relayer_getStatus for client polling
      status/route.ts         # 1Shot webhook receiver
      stream/route.ts         # SSE store (localhost only)
      services/               # Mock x402 service endpoints
  components/
    OnboardingForm.tsx        # Preferences form
    PermissionGrant.tsx       # ERC-7715 permission request
    AgentFeed.tsx             # Streaming agent text
    PaymentTimeline.tsx       # Activity cards + Basescan links
    BudgetBar.tsx             # Live spend tracker
    PermissionTimer.tsx       # Permission expiry countdown
  lib/
    oneshot.ts                # 1Shot relayer client
    delegation.ts             # ERC-7710 delegation builder
    types.ts                  # Shared TypeScript types
    store.ts                  # In-memory SSE pub/sub (localhost)
    wagmi.ts                  # wagmi + viem config (Base mainnet)
```

---

## Hackathon feedback

### MetaMask Smart Accounts Kit + ERC-7715

The `requestExecutionPermissions` API was the core of this project — and the documentation around it was the hardest part of the build.

**EIP-7702 and MetaMask Flask 13.9+**

The docs don't clearly state that MetaMask Flask 13.9+ handles the EIP-7702 account upgrade *automatically* inside `requestExecutionPermissions`. We spent several hours attempting to call `walletClient.signAuthorization()` manually, which threw `AccountTypeNotSupportedError` — json-rpc accounts (MetaMask) don't support it directly. We then tried raw `eth_signAuthorization` via the provider, which returned `[object Object]` instead of a proper authorization object.

The fix was simple: Flask handles it atomically, no manual signing needed. One sentence in the docs — *"Flask 13.9+ performs the EIP-7702 upgrade automatically inside requestExecutionPermissions"* — would have saved 2–3 hours. This is worth making prominent, ideally at the top of the EIP-7702 section.

**The `permissionsContext` return shape**

The object returned by `requestExecutionPermissions` doesn't have a documented TypeScript shape. We had to use runtime inspection to discover the context lives at `result[0].context` as an opaque hex blob, and that `decodeDelegations()` from `@metamask/delegation-toolkit` is needed to unpack it before passing it to a relayer. A code snippet showing how to extract and use the context with a relayer would remove this guesswork entirely.

**`periodDuration` validation error**

The error `InvalidInputRpcError: periodDuration must be > 0` surfaces with no further context when the user's chosen end time is already in the past. It's easy to hit during demos and testing. A guard in the SDK or a clearer message pointing to the cause (end time already elapsed) would make debugging faster.

### 1Shot Permissionless Relayer

The 1Shot documentation and the public relayer skills were the best part of this hackathon from a DX perspective. The JSON-RPC interface was clean, `relayer_send7710Transaction` worked exactly as documented, and the webhook shape (type 0/4/1 with `receipt.transactionHash`) was precise enough to implement against without guesswork.

**One gap worth closing:** `destinationUrl` silently does nothing on localhost because there's no public URL for 1Shot to call back to. The webhook is dropped without any error or warning. We only discovered this after deploying to Vercel and noticing payments were updating on prod but stuck locally. A dev note — *"use ngrok or a similar tunnel for local webhook testing"* — alongside the `destinationUrl` docs would close this in five minutes.

**Addresses in the quickstart:** The mainnet target address (`0x26a529124f0bbf9af9d8f9f84a43efe47cf1199a`) and the `EIP7702StatelessDeleGatorImpl` address (`0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B`) on Base are buried inside `relayer_getCapabilities` — not mentioned in the main quickstart. Listing them directly for Base mainnet would save builders one round-trip of discovery.

### Vercel + serverless architecture

A non-obvious issue when deploying: Next.js serverless functions are stateless and don't share memory across invocations. An in-memory pub/sub pattern (like an SSE store) works perfectly on localhost but silently breaks on Vercel because `/api/pay` and `/api/stream` run in separate function instances. The fix was to stream the agent response directly from the `/api/agent` route body and switch payment status updates to client-side polling of `/api/relay-status`. Worth documenting this pattern for anyone building agent + payment flows on serverless infrastructure.

### Overall hackathon experience

The track structure was well-defined and the technical bar was clear. The *Possible Directions* note in the 1Shot bounty — *"Projects that leverage the relayer webhooks as the source for transaction status updates will score higher"* — was genuinely useful signal that shaped architectural decisions early. More of that directional guidance in other tracks would help builders know what actually differentiates a submission versus just meeting the minimum bar.

---

## Built by

[Ooviya Manickam](https://github.com/OoviyaManickam) — MetaMask Hackathon 2026
