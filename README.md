# AgentPayGuard

**Agentic payments with verifiable identity and programmable governance—and a human override.**

[**中文**](README_zh.md)

---

# Part I — For Judges

## Vision

Kite’s whitepaper describes the bottleneck holding back the agent economy: *autonomous agents remain constrained by infrastructure designed for humans*—grant them financial authority and risk unbounded losses, or require manual authorization and eliminate autonomy. The answer is **trustless payment infrastructure** where agents act as **first-class economic actors** under **programmable constraints** and **immutable audit trails**, with **mathematically enforced safety, not assumed trust** ([*From Human-Centric to Agent-Native*](https://gokite.ai/kite-whitepaper)).

AgentPayGuard is one concrete implementation on Kite. We focus on three questions: *who* is spending (identity), *whether* we can stop it when needed (policy + freeze), and *how* we explain it afterward (audit trail). The loop is: natural-language payment requests → AI intent parsing and risk assessment → **programmable rules** and on-chain freeze checks → stablecoin transfer on Kite. Rules are enforced before execution; a 2/3 multisig provides a human override for freeze/unfreeze. The pipeline is model-agnostic—optional local or edge-deployed LLMs can later deliver sub-second, privacy-preserving decisions without changing the policy layer.

---

## What We Built

Aligned with Kite’s **SPACE** direction (stablecoin-native, programmable constraints, agent-first auth, compliance-ready audit, economically viable micropayments):

- **Natural-language payment:** The Agent accepts instructions like *"Pay 50 USDC to 0x... for server hosting"*, extracts recipient, amount, currency, and purpose, then runs policy and risk checks before any chain call.
- **Programmable constraints:** Allowlist, per-transfer and daily limits, on-chain freeze (multisig-controlled), and AI risk score/level—all enforced before execution, not by trust.
- **Stablecoin on Kite:** EOA and AA (Kite Account Abstraction) paths; evidence on Kite testnet for both.
- **Human override:** A 2/3 multisig (SimpleMultiSig) controls freeze/unfreeze. When an address is frozen, the Agent cannot send funds to it; unfreeze is a multisig execution.
- **Audit trail:** Every payment is checkable on-chain; policy and risk outcomes are explicit in logs and API responses.

---

## Track Alignment

| Requirement | How we meet it | Evidence |
|-------------|----------------|----------|
| **Chain payment** | Stablecoin transfer on Kite testnet (EOA + AA) | EOA: [Kite Tx](https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db) · AA: [Kite Tx](https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313) |
| **Agent identity** | KitePass (Agent Passport) + Kite AA SDK | KitePass API Key 身份验证；AA SDK 账户抽象；支付请求与 Agent 身份绑定 |
| **Permission control** | Allowlist, limits, on-chain freeze check before every payment | Multisig: `0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA` · Freeze Tx: [Kite Tx](https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c) |
| **Reproducibility** | One-command run; README and scripts for clone → run | Part II below; `pnpm demo:pay` / `pnpm demo:ai-agent "..."` |

---

## AI Latency & Future

**Why it's slow (cold path):** The main delay in “AI pay” is the remote LLM call (one combined call when possible; fallback to two sequential calls). First request is typically ~1–4 s with the single-call path; repeated or same-intent requests are served from cache in &lt;0.01 s. We now use **one** combined AI call (parse intent + assess risk in a single prompt) when possible; if that fails we fall back to two sequential calls. Request- and intent-level caching; server reuses `getTokenDecimals` and `readSpentToday` (no duplicate RPC/file read per request).

**Future:** Local or edge-deployed models would cut latency and could merge intent + risk into one prompt for a true single-call path. The pipeline (intent → risk → policy → chain) is already model-agnostic; swapping the cloud API for a local LLM would be a drop-in replacement for the inference layer.

---

## Extensibility: Other Dapps

The backend exposes HTTP APIs: `/api/policy`, `/api/pay`, `/api/ai-pay`, `/api/freeze`. Any Dapp or service can:

- **Query policy** (allowlist count, limits) and **freeze status** of an address.
- **Submit payments** (with or without natural language) under the same rules and risk checks.

So other Dapps can reuse our policy and risk layer without reimplementing it; they call our API and we enforce allowlist, limits, freeze, and optional AI risk before executing on Kite.

---

## Use Cases & Future Work (aligned with Kite whitepaper)

**Use cases (§6).** The whitepaper describes scenarios where agent autonomy meets programmable payments: **gaming** (true microtransactions, parental limits), **IoT** (M2M bandwidth, pay-per-packet), **creator economy** (fan-to-creator tips, programmable splits), **API economy** (every call becomes a transaction, per-request billing), **e-commerce** (programmable escrow, conditional release), **personal finance** (autonomous budgets, bills, small investments under limits), **knowledge markets** (decentralized expertise, micropayments per contribution), **supply chain** (autonomous commercial networks, escrow on milestones), **DAOs** (AI-enhanced treasury, rebalancing within policy, human vote for large moves). AgentPayGuard implements the **payment + policy + freeze** layer these use cases rest on: allowlist, limits, on-chain freeze, and optional AI risk. Any of the above—a game agent, an API billing service, a personal-finance bot—can call our APIs and get enforced rules and auditability on Kite.

**Future work (§7).** The whitepaper outlines: **ZK-verified agent credentials** (prove attributes without revealing data), **verifiable inference and computation** (cryptographic proof of model outputs and decision lineage), **portable reputation networks** (on-chain reputation, cross-platform portability, automated trust decisions), **verifiable service discovery** (capability and compliance attestations), **comprehensive traceability and attestation** (every action paired with attestations, regulatory compliance, automated recourse). Our own roadmap—local or edge-deployed LLMs for sub-second, privacy-preserving intent/risk—fits this direction: we keep the same policy and audit layer and can later plug in attested or local models; verifiable inference (when available) would slot into the same pipeline.

Details: [Kite Whitepaper](https://gokite.ai/kite-whitepaper); full text in `docs/resources/kite_whitepaper.md` (§6 Use Cases, §7 Future Work).

---

## Team

| Role | Responsibility |
|------|----------------|
| **Sulla** | Backend, demo flow, architecture, theme design, video production |
| **huahua** | Contracts, multisig wallet (SimpleMultiSig / SimpleFreeze) |
| **yoona** | Frontend (Web UI, dashboards, visualization) |
| **zh4o** | PPT, video editing, visuals and asset organization |

---

## FAQ: After Freeze, How Are Funds Recovered?

In AgentPayGuard, “freeze” means **the Agent is not allowed to send funds to that address**. It does **not** lock or confiscate assets already held by that address. So:

- Funds **already in** the frozen address remain under the control of that address’s owner (private key). The owner can move them as usual.
- To allow the Agent to **pay that address again**, multisig members execute **unfreeze**; after that, payments to that address are permitted again by policy.

If in a future design funds were held in a **vault contract** controlled by multisig, withdrawal would be a separate multisig-executed transaction (e.g. “withdraw from vault to address X”); the current SimpleFreeze only gates “Agent → recipient,” not vault withdrawals.

---

## References (Official)

- [Kite Whitepaper](https://gokite.ai/kite-whitepaper) — *From Human-Centric to Agent-Native: Building Trustless Payment Infrastructure for Agentic AI*
- [Kite Account Abstraction SDK](https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk)
- [Kite Multisig Wallet](https://docs.gokite.ai/kite-chain/5-advanced/multisig-wallet)
- [SPARK AI Hackathon](https://github.com/CasualHackathon/SPARK-AI-Hackathon)

Project whitepaper sources: `docs/resources/kite_whitepaper.md`, `docs/resources/kite_micar_whitepaper.md`.

---

# Part II — For Developers

## Quick Start

```bash
git clone <repo> && cd AgentPayGuard && git submodule update --init --recursive
pnpm i
cp .env.example .env   # set PRIVATE_KEY, RPC_URL, SETTLEMENT_TOKEN_ADDRESS, RECIPIENT
pnpm demo:pay          # dry run (no on-chain tx)
pnpm demo:ai-agent "Pay 10 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b for test"
```

Real on-chain: set `EXECUTE_ONCHAIN=1` in `.env` and ensure the wallet has test KITE and stablecoin (see [Test preparation](#test-preparation) below).

## Environment

- Node.js ≥ 18 (20+ recommended), pnpm
- `.env`: `PRIVATE_KEY`, `RPC_URL` (default Kite testnet), `SETTLEMENT_TOKEN_ADDRESS`, `RECIPIENT`; optional `OPENAI_API_KEY` or other AI keys for intent/risk (see `.env.example`)

Optional: [Chainlink env-enc](https://www.npmjs.com/package/@chainlink/env-enc) for encrypting secrets—run `npx env-enc set-pw` once to set the password, then `npx env-enc set` to write secrets.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm demo:pay` | One payment flow (dry run by default) |
| `pnpm demo:reject` | Trigger policy reject (e.g. not in allowlist) |
| `pnpm demo:freeze` | Verify on-chain freeze check |
| `pnpm demo:ai-agent "Pay 50 USDC to 0x... for hosting"` | Natural-language payment |
| `pnpm server` | Start API (default port 3456): `/api/health`, `/api/policy`, `/api/pay`, `/api/ai-pay`, `/api/freeze` |
| `pnpm typecheck` | TypeScript check |

**Server tip:** For real-time logs, run `npx tsx src/server.ts` instead of `pnpm server`. If **PRIVATE_KEY** is in **.env.enc** (Chainlink env-enc), run `npx env-enc set-pw` once, then `npx env-enc set` to store secrets; then start the server with `npx tsx src/server.ts` (config loads .env.enc at startup).

## Frontend

- Submodule: `frontend/`. After clone, run `git submodule update --init --recursive`.
- Run: `cd frontend && npm i && npm run dev`. With main repo API on 3456, the dev server proxies `/api` to it.
- Pages: Pay, AI Pay, Freeze, Proposals, Dashboard, History (real contract data). Policy and freeze status are shown and can be queried via API. Wallet balance (e.g. in the wallet modal) is **real chain data** from the connected chain (wagmi `useBalance`).

## Test preparation

- **KITE:** [Kite testnet faucet](https://faucet.gokite.ai/) (per-address limit).
- **Stablecoin:** Set `SETTLEMENT_TOKEN_ADDRESS` in `.env` (see Kite docs for testnet token).
- Low-balance testing: small `AMOUNT` / `MAX_AMOUNT` / `DAILY_LIMIT` with dry run covers most policy/freeze cases; see `docs/guides/TESTING_GUIDE.md` for details.

## Repo structure

| Path | Purpose |
|------|---------|
| `src/server.ts` | HTTP API |
| `src/lib/ai-intent.ts` | Intent parsing + risk assessment |
| `src/lib/policy.ts` | Policy engine (allowlist, limits, freeze, AI risk) |
| `src/lib/run-pay.ts` | Shared pay logic (CLI + API) |
| `src/lib/kite-aa.ts` | Kite AA (ERC-4337) |
| `src/demo-ai-agent.ts`, `demo-pay.ts`, `demo-reject.ts` | Demos |
| `contracts/` | SimpleMultiSig, SimpleFreeze |
| `frontend/` | Web UI (submodule) |

## Kite & submission

- **Kite testnet:** RPC `https://rpc-testnet.gokite.ai/` · Explorer: [testnet.kitescan.ai](https://testnet.kitescan.ai/)

### Agent Identity (KitePass)

AgentPayGuard integrates **KitePass (Agent Passport)** identity system to meet track requirements:

- **KitePass API Key**: Set `KITE_API_KEY` in `.env` to use official KitePass identity (recommended)
- **Fallback**: If `KITE_API_KEY` is not set, uses EOA address from `PRIVATE_KEY` as agent identifier
- **Payment Binding**: All payment requests are bound to agent identity for audit trail

**Getting KitePass API Key:**
1. Visit [Kite App](https://app.gokite.ai/)
2. Create or access your KitePass
3. Copy the API Key
4. Set `KITE_API_KEY=api_key_xxx` in `.env`

The agent identity is automatically initialized on startup and bound to every payment request.
- **Hackathon:** [SPARK AI Hackathon](https://github.com/CasualHackathon/SPARK-AI-Hackathon)
