# AgentPayGuard（从零脚手架）

本仓库提供一个**可复现的最小 MVP**，用于 Kite Payment Track：

- **demo:pay**：通过“策略校验 → 稳定币支付（ERC-20 转账）”跑通一笔链上支付（测试网）
- **demo:reject**：故意触发策略（白名单/限额）并拒绝

> 说明：为了避免误转账，默认不发链上交易。你需要显式设置 `EXECUTE_ONCHAIN=1` 才会真的发送。

---

## 环境要求

- Node.js >= 18（建议 20+）
- pnpm

---

## 快速开始

1) 安装依赖

```bash
pnpm i
```

2) 配置环境变量

复制 `.env.example` 为 `.env`，填好以下关键项：

- `PRIVATE_KEY`：测试网私钥（只用于测试）
- `RPC_URL`：默认已填 Kite Testnet RPC：`https://rpc-testnet.gokite.ai/`
- `SETTLEMENT_TOKEN_ADDRESS`：Kite 测试网稳定币（或结算 token）合约地址（从官方文档获取）
- `RECIPIENT`：收款地址

3) 运行 Demo（默认 dry-run）

```bash
pnpm demo:pay
pnpm demo:reject
```

4) 真正发送链上交易（测试网）

把 `.env` 里的 `EXECUTE_ONCHAIN=1` 打开，然后再次运行：

```bash
pnpm demo:pay
```

输出里会打印 tx hash（把它填到 `for_judge.md` 的占位里）。

---

## 可选：走 AA（gokite-aa-sdk / bundler）

如果你已经有 bundler 服务（或官方提供的 bundler URL），可以把 `.env` 改为：

- `PAYMENT_MODE=aa`
- `BUNDLER_URL=...`
- `EXECUTE_ONCHAIN=1`

然后执行同样的命令：

```bash
pnpm demo:pay
```

输出会包含 `userOpHash` 与最终状态（用于展示 AA 路径的执行结果）。

---

## 策略说明（最小可复现）

当前实现的最小策略集：

- **收款白名单**：`ALLOWLIST`（逗号分隔地址）
- **单笔上限**：`MAX_AMOUNT`
- **周期限额（可选）**：`DAILY_LIMIT`（按本地 `STATE_PATH` 记录当天累计）

---

## Kite 官方参考

- AA SDK：`https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk`
- 多签钱包：`https://docs.gokite.ai/kite-chain/5-advanced/multisig-wallet`

> 我们在代码里预留了对 `gokite-aa-sdk` 的探测入口（`PROBE_KITE_AA=1`），后续你接入 AA 路径时可以用来校准 SDK 的真实导出与用法。

---

## 可选：KitePass / Agent 身份（Python 侧最小演示）

Kite AIR 的“Agent 身份”在当前文档里主要以 **KitePass API Key** 的形式交付（`api_key_...`）。本仓库提供一个最小 Python 脚本，方便你拿来录屏/截图证明“身份已接入”：

```bash
python -m pip install -r python/requirements.txt

# PowerShell：只验证 API key 初始化成功（不调用 service）
$env:KITE_API_KEY="api_key_xxx"
python python/kitepass_demo.py

# PowerShell：可选（需要你从 app 里复制 service id）
$env:KITE_SERVICE_ID="agent_xxx"
$env:KITE_PAYLOAD_JSON='{"foo":"bar"}'
python python/kitepass_demo.py
```

> 说明：支付赛道的“链上稳定币转账”仍以 `pnpm demo:pay` 为主；Python 部分是为了更容易展示/证明“Agent 身份（KitePass）”已接入。

