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

**6. Status updates** — The browser polls `/api/relay-status` every 3 seconds while the transaction settles. On production, 1Shot POSTs to `/api/status` at each state change (type 4 = submitted, type 0 = confirmed, type 1 = failed) — used as the authoritative source of truth for payment status.

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

## Smart Accounts Kit Usage

### Advanced Permissions

**Requesting Advanced Permissions (ERC-7715):**
[`src/components/PermissionGrant.tsx`](https://github.com/OoviyaManickam/Roam/blob/main/src/components/PermissionGrant.tsx)

`requestExecutionPermissions` is called with an `erc20-token-periodic` permission — scoped to the 1Shot target address, capped to the user's USDC budget, expiring at their chosen end time. MetaMask Flask 13.9+ atomically performs the EIP-7702 account upgrade inside this call.

**Redeeming Advanced Permissions (ERC-7710 delegation decoding):**
[`src/lib/delegation.ts`](https://github.com/OoviyaManickam/Roam/blob/main/src/lib/delegation.ts)

The `permissionsContext` blob returned by Flask is decoded using `decodeDelegations()` from `@metamask/delegation-toolkit` before being passed to the 1Shot relayer.

### Delegations

**Creating the delegation:**
[`src/components/PermissionGrant.tsx`](https://github.com/OoviyaManickam/Roam/blob/main/src/components/PermissionGrant.tsx)

The ERC-7710 delegation is created by `requestExecutionPermissions` — the resulting `permissionsContext` is the signed delegation chain.

**Redeeming the delegation:**
[`src/app/api/pay/route.ts`](https://github.com/OoviyaManickam/Roam/blob/main/src/app/api/pay/route.ts)

`/api/pay` decodes the delegation chain and submits it to the 1Shot relayer via `relayer_send7710Transaction`. The relayer redeems it on-chain — no signer required at payment time.

### x402

**x402 service endpoints (server):**
[`src/app/api/services/`](https://github.com/OoviyaManickam/Roam/blob/main/src/app/api/services)

Mock x402-compatible service endpoints for food, coffee, and music — each verifies the `X-Payment` header before returning access.

**x402 ERC-7710 asset transfer (client):**
[`src/app/api/pay/route.ts`](https://github.com/OoviyaManickam/Roam/blob/main/src/app/api/pay/route.ts)

Payment calls are structured as ERC-7710 executions — USDC transfer built via `buildTransferCall` in `src/lib/delegation.ts`, submitted through the 1Shot relayer using the signed delegation context.

---

## 1Shot API Usage

**Relayer client — `relayer_send7710Transaction` + `relayer_getStatus`:**
[`src/lib/oneshot.ts`](https://github.com/OoviyaManickam/Roam/blob/main/src/lib/oneshot.ts)

All 1Shot API interactions — submitting 7710 transactions with `destinationUrl` for webhook callbacks, polling status, and resolving status codes (110 → submitted, 200 → confirmed, 400/500 → failed).

**Payment submission with webhook:**
[`src/app/api/pay/route.ts`](https://github.com/OoviyaManickam/Roam/blob/main/src/app/api/pay/route.ts)

Calls `relay()` from `oneshot.ts` with `destinationUrl` set to `/api/status` on the deployed URL.

**Webhook receiver:**
[`src/app/api/status/route.ts`](https://github.com/OoviyaManickam/Roam/blob/main/src/app/api/status/route.ts)

Receives 1Shot webhook POSTs. Parses type 0 (confirmed), type 4 (submitted), type 1 (failed) and updates payment status accordingly. Used as the authoritative source of truth for payment state on production.

**Client-side relay status polling:**
[`src/app/api/relay-status/route.ts`](https://github.com/OoviyaManickam/Roam/blob/main/src/app/api/relay-status/route.ts)

Proxies `relayer_getStatus` to the browser for local development fallback.

---

## Hackathon Feedback

### MetaMask Smart Accounts Kit + ERC-7715

The Smart Accounts Kit was central to this project and worked well overall.

One area that could be made clearer is the EIP-7702 flow. Initially, I assumed the account upgrade needed to be handled manually and spent some time exploring `signAuthorization()` before discovering that MetaMask Flask 13.9+ performs the upgrade automatically within `requestExecutionPermissions`.

A small note highlighting this behavior near the EIP-7702 documentation would help builders get started faster.

Another helpful addition would be a short example showing how to extract and decode the `permissionsContext` returned by `requestExecutionPermissions` before passing it to a relayer.

### 1Shot Permissionless Relayer

The 1Shot relayer was one of the smoothest parts of the build. The JSON-RPC interface was straightforward, `relayer_send7710Transaction` worked as expected, and the webhook payloads were easy to integrate.

One suggestion would be to add a note that `destinationUrl` callbacks require a publicly accessible URL. During local development, a brief recommendation to use tools such as ngrok would make webhook testing easier.

It would also be helpful if commonly used Base Mainnet addresses were surfaced directly in the quickstart documentation instead of only through `relayer_getCapabilities`.

### Vercel Deployment

One challenge I encountered was adapting the architecture for Vercel's serverless environment, where functions do not share in-memory state.

I eventually solved this by streaming responses directly from the agent route and moving transaction status updates to a dedicated endpoint. A short deployment guide covering this pattern could be useful for teams building agent-based applications with real-time updates.

### Overall Experience

The hackathon was well structured, and the technical requirements were clear.

I especially appreciated the guidance in the 1Shot bounty around using webhooks as the source of truth for transaction status. That kind of directional feedback helped shape architectural decisions early and made it easier to understand what would strengthen a submission beyond the minimum requirements.

Overall, the experience was excellent and gave me the opportunity to explore ERC-7715, EIP-7702, ERC-7710, and delegated execution patterns in a real-world application.

---

## Built by

[Ooviya Manickam](https://github.com/OoviyaManickam) — MetaMask Hackathon 2026
