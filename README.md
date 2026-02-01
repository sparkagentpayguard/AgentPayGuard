# AgentPayGuard

**Agentic payments with verifiable identity and programmable governance—and a human override.**

[**中文**](README_zh.md)

---

# Part I — For Judges

## Problem Statement

When AI Agents start making real payments, three critical questions emerge:

1. **Who is spending (Identity)**: Service providers and users need to verify which Agent is making the payment, on whose behalf, and under what authorization.
2. **Can we stop it when needed (Control)**: When Agents are subject to prompt injection, key/session leaks, or abnormal behavior, payments must be forcibly intercepted before execution or at execution boundaries.
3. **Can we explain it afterward (Audit)**: We need traceable audit trails to answer: why was this payment made, to whom, who approved it, and were the rules followed?

Kite's whitepaper describes the bottleneck holding back the agent economy: *autonomous agents remain constrained by infrastructure designed for humans*—grant them financial authority and risk unbounded losses, or require manual authorization and eliminate autonomy. The answer is **trustless payment infrastructure** where agents act as **first-class economic actors** under **programmable constraints** and **immutable audit trails**, with **mathematically enforced safety, not assumed trust** ([*From Human-Centric to Agent-Native*](https://gokite.ai/kite-whitepaper)).

---

## Solution

AgentPayGuard is one concrete implementation on Kite. We focus on three questions: *who* is spending (identity), *whether* we can stop it when needed (policy + freeze), and *how* we explain it afterward (audit trail). The loop is: natural-language payment requests → AI intent parsing and risk assessment → **programmable rules** and on-chain freeze checks → stablecoin transfer on Kite. Rules are enforced before execution; a 2/3 multisig provides a human override for freeze/unfreeze. The pipeline is model-agnostic—optional local or edge-deployed LLMs can later deliver sub-second, privacy-preserving decisions without changing the policy layer.

### Core Features

Aligned with Kite's **SPACE** direction (stablecoin-native, programmable constraints, agent-first auth, compliance-ready audit, economically viable micropayments):

- **Natural-language payment:** The Agent accepts instructions like *"Pay 50 USDC to 0x... for server hosting"*, extracts recipient, amount, currency, and purpose, then runs policy and risk checks before any chain call.
- **Programmable constraints:** Allowlist, per-transfer and daily limits, on-chain freeze (multisig-controlled), and AI risk score/level—all enforced before execution, not by trust.
- **Stablecoin on Kite:** EOA and AA (Kite Account Abstraction) paths; evidence on Kite testnet for both.
- **Human override:** A 2/3 multisig (SimpleMultiSig) controls freeze/unfreeze. When an address is frozen, the Agent cannot send funds to it; unfreeze is a multisig execution.
- **Audit trail:** Every payment is checkable on-chain; policy and risk outcomes are explicit in logs and API responses.

---

## Technology Stack

### Why These Technologies

1. **Kite AA SDK (Account Abstraction)**
   - **Why**: Enables Agent-first authentication with hierarchical identity delegation, solving credential management complexity
   - **What**: Uses `gokite-aa-sdk` to create smart contract accounts for agents, enabling programmable constraints at the protocol level
   - **Benefit**: Agents can act as first-class economic actors without manual key management

2. **AI Intent Parsing + Risk Assessment**
   - **Why**: Natural language understanding enables human-friendly interaction while AI risk assessment provides intelligent threat detection
   - **What**: Multi-provider LLM support (OpenAI, DeepSeek, Gemini, Claude, Ollama) for intent parsing and risk scoring
   - **Benefit**: Detects prompt injection, suspicious patterns, and contextual anomalies that rule-based systems miss

3. **Multi-layer Policy Engine**
   - **Why**: Defense in depth—combines rule-based checks (allowlist, limits) with AI risk assessment and on-chain freeze status
   - **What**: Traditional rules (allowlist, max amount, daily limit) + AI risk score (0-100) + on-chain freeze check (multisig-controlled)
   - **Benefit**: Mathematical enforcement before execution, not trust-based—rules are checked before any chain call

4. **On-chain Freeze Mechanism**
   - **Why**: Provides emergency stop capability when AI detects threats or multisig members identify suspicious activity
   - **What**: SimpleFreeze contract controlled by 2/3 multisig (SimpleMultiSig)
   - **Benefit**: Human override for freeze/unfreeze, enabling rapid response to security incidents

5. **Model-agnostic Pipeline**
   - **Why**: Future-proof design allows swapping cloud LLMs for local/edge models without changing policy layer
   - **What**: Clean separation between AI inference layer and policy enforcement layer
   - **Benefit**: Can migrate to sub-second, privacy-preserving local models later while maintaining same security guarantees

### Technical Architecture

```
User (Authorization/Policy Configuration)
  └─ Agent (Kite Identity: Agent/Passport)
       └─ AI Intent Parser (Natural Language Parsing + Risk Assessment)
            └─ AA Smart Account (Kite AA SDK)
                 └─ Policy Guard (Allowlist/Limits/Validity + AI Risk Assessment...)
                      └─ Stablecoin Payment (On-chain Transfer)
                           └─ Audit Trail (On-chain Verifiable + Optional Local Logs)

Anomaly/High Risk → SimpleMultiSig (2/3 Multisig) Intervention: Freeze/Unfreeze/Policy Update
```

---

## Track Alignment

| Requirement | How we meet it | Evidence |
|-------------|----------------|----------|
| **Chain payment** | Stablecoin transfer on Kite testnet (EOA + AA) | EOA: [Kite Tx](https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db) · AA: [Kite Tx](https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313) |
| **Agent identity** | KitePass (Agent Passport) + Kite AA SDK | KitePass API Key (optional) or AA SDK Account Abstraction (no API key required); payment requests bound to Agent identity |
| **Permission control** | Allowlist, limits, on-chain freeze check before every payment | Multisig: `0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA` · Freeze Tx: [Kite Tx](https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c) |
| **Reproducibility** | One-command run; README and scripts for clone → run | Part II below; `pnpm demo:pay` / `pnpm demo:ai-agent "..."` |

---

## Future Improvements

### Short-term (P0)

1. **Performance Optimization**
   - **Current**: Remote LLM calls take ~1–4s (cold path); cached requests <0.01s
   - **Improvement**: Local or edge-deployed models (Ollama, LM Studio) for sub-second latency
   - **Why**: Reduces latency from seconds to milliseconds, enables real-time payment decisions

2. **ML-based Risk Detection**
   - **Current**: LLM-only risk assessment, no structured feature engineering
   - **Improvement**: Add XGBoost model for structured risk prediction (52-dimensional features: time windows, transaction intervals, amount sequences, address patterns)
   - **Why**: Combines LLM's contextual understanding with ML's pattern recognition for higher accuracy

3. **Anomaly Detection**
   - **Current**: Rule-based checks only
   - **Improvement**: Isolation Forest for unsupervised anomaly detection (cold start without labeled data)
   - **Why**: Detects novel attack patterns that rules and supervised models miss

### Long-term (P1/P2)

1. **Verifiable Inference**
   - **Vision**: Cryptographic proof of model outputs and decision lineage (aligned with Kite whitepaper §7)
   - **Why**: Enables trustless verification of AI decisions without revealing model internals

2. **Portable Reputation Networks**
   - **Vision**: On-chain reputation, cross-platform portability, automated trust decisions
   - **Why**: Builds trust across different agent platforms and services

3. **ZK-verified Agent Credentials**
   - **Vision**: Prove agent attributes without revealing data
   - **Why**: Privacy-preserving identity verification for compliance and trust

### Current Performance

**AI Latency:** The main delay in "AI pay" is the remote LLM call (one combined call when possible; fallback to two sequential calls). First request is typically ~1–4 s with the single-call path; repeated or same-intent requests are served from cache in <0.01 s. We now use **one** combined AI call (parse intent + assess risk in a single prompt) when possible; if that fails we fall back to two sequential calls. Request- and intent-level caching; server reuses `getTokenDecimals` and `readSpentToday` (no duplicate RPC/file read per request).

**Future:** Local or edge-deployed models would cut latency and could merge intent + risk into one prompt for a true single-call path. The pipeline (intent → risk → policy → chain) is already model-agnostic; swapping the cloud API for a local LLM would be a drop-in replacement for the inference layer.

---

## Extensibility: Other Dapps

The backend exposes HTTP APIs: `/api/policy`, `/api/pay`, `/api/ai-pay`, `/api/freeze`. Any Dapp or service can:

- **Query policy** (allowlist count, limits) and **freeze status** of an address.
- **Submit payments** (with or without natural language) under the same rules and risk checks.

So other Dapps can reuse our policy and risk layer without reimplementing it; they call our API and we enforce allowlist, limits, freeze, and optional AI risk before executing on Kite.

---

## Use Cases

The Kite whitepaper (§6) describes scenarios where agent autonomy meets programmable payments. AgentPayGuard implements the **payment + policy + freeze** layer these use cases rest on:

- **Gaming**: True microtransactions with parental limits
- **IoT**: M2M bandwidth, pay-per-packet
- **Creator Economy**: Fan-to-creator tips, programmable splits
- **API Economy**: Every call becomes a transaction, per-request billing
- **E-commerce**: Programmable escrow, conditional release
- **Personal Finance**: Autonomous budgets, bills, small investments under limits
- **Knowledge Markets**: Decentralized expertise, micropayments per contribution
- **Supply Chain**: Autonomous commercial networks, escrow on milestones
- **DAOs**: AI-enhanced treasury, rebalancing within policy, human vote for large moves

Any of the above—a game agent, an API billing service, a personal-finance bot—can call our APIs (`/api/pay`, `/api/ai-pay`) and get enforced rules and auditability on Kite.

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

In AgentPayGuard, "freeze" means **the Agent is not allowed to send funds to that address**. It does **not** lock or confiscate assets already held by that address. So:

- Funds **already in** the frozen address remain under the control of that address's owner (private key). The owner can move them as usual.
- To allow the Agent to **pay that address again**, multisig members execute **unfreeze**; after that, payments to that address are permitted again by policy.

If in a future design funds were held in a **vault contract** controlled by multisig, withdrawal would be a separate multisig-executed transaction (e.g. "withdraw from vault to address X"); the current SimpleFreeze only gates "Agent → recipient," not vault withdrawals.

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
