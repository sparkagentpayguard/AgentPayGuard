# PM & 角色 B 规整文档

> 本文档整合了项目管理、角色 B 实现、测试、A→B 交付等所有相关内容，按用途分类，保留必要信息。

---

## 一、快速入口

| 角色 | 首要任务 | 文档 |
|------|----------|------|
| **PM** | 检查子模块、RPC、交接 | 见 [§ 二、PM 检查清单](#二pm-检查清单) |
| **Role B** | 产出 EOA/AA Tx Hash 交 C | 见 [§ 三、角色 B 检查清单](#三角色-b-检查清单) |
| **Role B** | 测试步骤与演讲 | 见 [§ 五、测试与演讲](#五测试与演讲) |
| **Role B** | A 交付的合约集成 | 见 [§ 六、A→B 交付](#六ab-交付) |

---

## 二、PM 检查清单

- [ ] 新成员克隆后执行 `git submodule update --init --recursive`
- [ ] 前端 RPC/浏览器为 Kite 官方：`rpc-testnet.gokite.ai` / `testnet.kitescan.ai`
- [ ] 前后端若有 API 需求，接口约定已写在 allocation 或单独文档
- [ ] 子模块仓库权限与发布节奏已明确

### 项目完成标准

- `for_judge.md` 的 4 行赛道要求表格全部填满
- 所有 Tx Hash 均可在 Kite 浏览器验证
- 演示脚本 `pnpm demo:pay` / `pnpm demo:reject` 可独立运行
- 多签钱包和冻结交易已完成链上执行

### 交接总表（关键证据）

| 证据项 | 来源 | 接收方 | 状态 |
|--------|------|--------|------|
| 支付 Tx Hash (EOA) | B | C | 🟡 待 EXECUTE_ONCHAIN=1 |
| 支付 Tx Hash (AA) | B | C | 🟡 待 EXECUTE_ONCHAIN=1 |
| 冻结 Tx Hash | A | C | 待 A 交付 |
| 代码实现 | B | C/D | ✅ 已交付 |
| 多签地址 | A | B/C | 待 A 交付 |

---

## 三、角色 B 检查清单

- [ ] EOA Tx Hash 已产出并交付 C
- [ ] AA Tx Hash 已产出并交付 C
- [ ] 环境变量与 TESTING_GUIDE / .env.example 一致
- [ ] 若启用冻结检查，`FREEZE_CONTRACT_ADDRESS` 与 A 交付一致
- [ ] AGENT_WORKLOG 已更新（完成 EOA/AA 后追加 Phase）

### 交付物（B → C）

- EOA Tx Hash、AA Tx Hash
- Kite 浏览器链接（`https://testnet.kitescan.ai/tx/0x...`）

---

## 四、角色 B 核心实现

### 代码位置

| 文件 | 用途 |
|------|------|
| `src/lib/kite-aa.ts` | AA 支付（ERC-4337 UserOperation） |
| `src/lib/erc20.ts` | EOA 转账 |
| `src/lib/policy.ts` | 策略校验（白名单/限额/有效期） |
| `src/demo-pay.ts` | 支付 Demo 主入口 |
| `src/demo-reject.ts` | 拒绝 Demo |

### 测试命令速查

```bash
# 干运行（无链上交易）
PAYMENT_MODE=eoa EXECUTE_ONCHAIN=0 pnpm demo:pay
PAYMENT_MODE=aa  EXECUTE_ONCHAIN=0 pnpm demo:pay

# 真实 EOA 支付
PAYMENT_MODE=eoa EXECUTE_ONCHAIN=1 pnpm demo:pay

# 真实 AA 支付
PAYMENT_MODE=aa EXECUTE_ONCHAIN=1 pnpm demo:pay

# 拒绝演示
pnpm demo:reject

# 冻结验证（依赖 A 的冻结合约）
pnpm demo:freeze
```

### 环境配置要点

- `OWNER_PRIVATE_KEY` / `PRIVATE_KEY`：测试网私钥
- `KITE_SETTLEMENT_TOKEN` / `SETTLEMENT_TOKEN_ADDRESS`：`0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`（Kite 测试网 USDC）
- `KITE_RPC_URL` / `RPC_URL`：`https://rpc-testnet.gokite.ai/`
- `KITE_BUNDLER_URL` / `BUNDLER_URL`：`https://bundler-service.staging.gokite.ai/rpc/`（AA 模式必需）
- `EXECUTE_ONCHAIN=1`：真实链上执行

### 常见错误

| 错误 | 解决 |
|------|------|
| `Module not found: gokite-aa-sdk` | `pnpm install` |
| `OWNER_PRIVATE_KEY not found` | 检查 `.env` 存在且已设置 |
| `Insufficient balance` | 访问 https://faucet.gokite.ai/ 获取测试币 |
| `Bundler timeout` | 检查网络、减少金额、重试 |
| `NOT_IN_ALLOWLIST` | 检查 policy.ts 白名单或 ALLOWLIST 环境变量 |

---

## 五、测试与演讲

### 测试场景矩阵

| 场景 | 命令 | 目标 |
|------|------|------|
| 干运行 EOA | `PAYMENT_MODE=eoa EXECUTE_ONCHAIN=0 pnpm demo:pay` | 验证逻辑 |
| 干运行 AA | `PAYMENT_MODE=aa EXECUTE_ONCHAIN=0 pnpm demo:pay` | 验证 UO 构建 |
| 真实 EOA | `PAYMENT_MODE=eoa EXECUTE_ONCHAIN=1 pnpm demo:pay` | 获得 Tx Hash |
| 真实 AA | `PAYMENT_MODE=aa EXECUTE_ONCHAIN=1 pnpm demo:pay` | 获得 UO Hash + Tx Hash |
| 政策拒绝 | `pnpm demo:reject` | 白名单强制 |
| 冻结验证 | `pnpm demo:freeze` | 链上冻结风控 |

### 演讲要点（5–7 分钟）

1. **问题与方案**：Agent 自主支付 + 三层风控（策略 / AA / 多签冻结）
2. **代码讲解**：`kite-aa.ts` 的 `sendErc20ViaAA()` 流程；`policy.ts` 白名单/限额
3. **现场演示**：`pnpm demo:pay`（干运行 + 真实）、`pnpm demo:reject`
4. **链上证据**：在 Kite 浏览器展示 Tx Hash

详细讲稿与排练计划见 [TESTING_GUIDE.md](../guides/TESTING_GUIDE.md#role-b-演讲准备指南)。

---

## 六、A→B 交付

### 合约地址（Kite Testnet, Chain ID 2368）

| 合约 | 地址 | 用途 |
|------|------|------|
| 多签钱包 (SimpleMultiSig) | `0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA` | 2/3 多签 |
| 冻结合约 (SimpleFreeze) | `0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719` | 冻结/解冻/查询 |

### 集成方式（推荐：支付前检查冻结）

在 `policy.ts` 或 `demo-pay` 中，支付前调用冻结合约：

```typescript
const FREEZE_ABI = ['function isFrozen(address account) view returns (bool)'];
const freeze = new ethers.Contract('0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719', FREEZE_ABI, provider);
const isFrozen = await freeze.isFrozen(recipient);
if (isFrozen) return { allowed: false, reason: '收款地址已被多签冻结' };
```

### 环境变量（可选）

```bash
FREEZE_CONTRACT_ADDRESS=0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719
CHECK_FREEZE_STATUS=true
```

### 参考文档

- 完整交付说明：`docs/multisig/交付给角色B.md`
- 多签配置：`docs/multisig/multisig_config.md`
- 交易记录：`docs/multisig/tx_links.md`

---

## 七、文档索引

| 用途 | 文档 |
|------|------|
| Role B 详细测试步骤（5 场景 + 演讲） | [TESTING_GUIDE.md](../guides/TESTING_GUIDE.md) |
| A→B 合约交付（多签/冻结合约、ABI、集成方案） | [交付给角色B.md](../multisig/交付给角色B.md) |
| 总交付清单（A/B/C/D） | [FINAL_DELIVERY_CHECKLIST.md](FINAL_DELIVERY_CHECKLIST.md) |
| 角色分工与交接表 | [allocation.md](../reference/allocation.md) |
| Kite 链信息 | [chain_info.md](../multisig/chain_info.md) |
| 架构与实现细节（历史） | `docs/archived/ROLE_B_IMPLEMENTATION.md` |

---

**最后更新**：2026-01-31
