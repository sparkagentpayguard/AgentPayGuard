# 📊 角色 B 实现框架交付总结

**完成日期**：2026-01-29  
**负责人**：Sulla（后端 / AA 集成）  
**状态**：✅ 框架完成，准备实现阶段

---

## 📦 交付物清单

已创建以下文档文件供你参考与指导实现：

### 1. **ROLE_B_IMPLEMENTATION.md** (17KB)
   - 详细的实现步骤与框架
   - 两个实现方案（A 和 B）的完整代码
   - 常见问题与解决方案
   - 测试策略与成功指标

### 2. **QUICK_REFERENCE.md** (4.8KB)
   - 快速查阅卡
   - 命令速查表
   - 常见错误一览
   - 进度追踪

### 3. **ARCHITECTURE.md** (12KB)
   - 整体架构可视化
   - EOA vs AA 代码流程对比
   - GokiteAASDK API 猜测
   - ERC-20 callData 编码说明
   - 完整的参考代码框架

---

## 🎯 核心发现与结论

### ✅ 现有代码分析

| 组件 | 状态 | 代码行数 | 说明 |
|------|------|---------|------|
| EOA 路径 | ✅ 完整 | 30 | erc20.ts 可直接使用 |
| 策略引擎 | ✅ 完整 | 61 | 白名单/限额均已实现 |
| 状态管理 | ✅ 完整 | 49 | 本地日累计记录 |
| 环境配置 | ✅ 完整 | 58 | Zod schema 完整 |
| **AA 路径** | 🟡 半成品 | 47 | **需补完** |
| Demo 主程序 | ✅ 完整 | 96 | 已调用 AA（但 AA 未实现） |

### 🔍 代码关键发现

1. **erc20.ts 是 AA 的参考**
   - EOA 直接调用 `ethers.Contract.transfer()`
   - AA 需要编码相同的 `transfer()` 为 callData，通过 SDK 发送

2. **当前 kite-aa.ts 有问题**
   - API 调用方式可能不匹配（`sendUserOperation` vs `sendUserOperationAndWait`）
   - 返回值解析不清晰（`status: unknown`）
   - 缺少错误处理与详细日志

3. **demo-pay.ts 已为 AA 预留入口**
   - `PAYMENT_MODE=aa` 时自动调用 `sendErc20ViaAA()`
   - 已验证 `BUNDLER_URL` 必须存在
   - 已为 `PAYMASTER_ADDRESS` 预留位置

---

## 🚀 立即下一步

### **第一步：探测 SDK（5 分钟）**

```bash
cd /home/user/AgentPayGuard
PROBE_KITE_AA=1 pnpm demo:pay
```

**目标**：确认 SDK 的实际导出  
**记录**：复制输出中的 SDK 导出列表

### **第二步：选择实现方案（10 分钟）**

根据 PROBE 的输出结果，选择：

- **方案 A**（推荐）：如果 SDK 有 `sendUserOperationAndWait` 方法
  - 一步完成 UserOp 发送与确认
  - 更简洁，推荐使用

- **方案 B**（备选）：如果 SDK 只有 `sendUserOperation` + `pollUserOperationStatus`
  - 分步发送与轮询
  - 需要处理轮询超时

### **第三步：实现代码（1-2 小时）**

更新 [src/lib/kite-aa.ts](src/lib/kite-aa.ts)：

```typescript
// 参考 ARCHITECTURE.md 中的"完整的实现框架"部分
// 复制代码框架，根据 SDK 实际 API 调整
```

### **第四步：验证类型（10 分钟）**

```bash
pnpm typecheck
# 期望：no errors
```

### **第五步：测试 EOA 路径（15 分钟）**

```bash
# 首先配置 .env（参考 QUICK_REFERENCE.md）
cp .env.example .env
# 编辑 .env：填入 PRIVATE_KEY 和 RECIPIENT

# Dry run
pnpm demo:pay
# 期望：[DRY_RUN] 通过策略校验

# 实际测试
EXECUTE_ONCHAIN=1 pnpm demo:pay
# 期望：[EOA] txHash: 0x...
# 记录此 txHash，填入 for_judge.md
```

### **第六步：测试 AA 路径（30 分钟）**

```bash
PAYMENT_MODE=aa \
BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/ \
EXECUTE_ONCHAIN=1 \
pnpm demo:pay

# 期望：
# [AA] userOpHash: 0x...
# [AA] status: { status: 'success', transactionHash: '0x...' }
```

### **第七步：填充证据（10 分钟）**

更新 [for_judge.md](for_judge.md)：

```markdown
| 链上支付 | 完成 1 笔测试网稳定币转账 | **Tx Hash**：`0x<YOUR_TX_HASH>` |
```

---

## 📚 文档导航

### 快速开始（5 分钟）
👉 [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- 命令速查表
- 参数配置模板
- 常见错误速查

### 详细实现指南（30 分钟阅读）
👉 [ROLE_B_IMPLEMENTATION.md](ROLE_B_IMPLEMENTATION.md)
- 现有代码分析
- 两个完整实现方案
- 测试策略与成功指标
- 常见问题解决方案

### 架构深入理解（20 分钟阅读）
👉 [ARCHITECTURE.md](ARCHITECTURE.md)
- 整体架构可视化
- EOA vs AA 代码流程对比
- SDK API 猜测与说明
- ERC-20 编码详解
- 完整参考代码框架

### 项目总体说明
👉 [README.md](README.md) - 项目概述
👉 [allocation.md](allocation.md) - 分工说明
👉 [for_judge.md](for_judge.md) - 评委判定表

---

## 💡 关键要点速记

### EOA 路径（参考已实现）
```
Wallet.transfer() → ethers.Contract.transfer() → 链上 txHash
```

### AA 路径（需实现）
```
Wallet → GokiteAASDK → encodeFunctionData() → sendUserOperation()
→ Bundler → 链上 txHash
```

### 核心工作
```
❌ API 错误
  sdk.sendUserOperation() ❌ 不完整
  
✅ 正确选择（需验证）
  方案 A: sdk.sendUserOperationAndWait() ⭐ 推荐
  方案 B: sdk.sendUserOperation() + pollUserOperationStatus()
```

### 签名关键
```typescript
// ✅ 正确
await wallet.signMessage(ethers.getBytes(userOpHash))

// ❌ 错误（userOpHash 本身是 hex 字符串）
await wallet.signMessage(userOpHash)
```

### 返回值
```typescript
// EOA
{ txHash: string }

// AA
{
  userOpHash: string,
  txHash: string | null,
  status: 'success' | 'failed' | 'pending',
  reason?: string
}
```

---

## 🎯 成功标志

✅ **框架设计完成**（当前阶段）
- 现有代码分析完毕
- 两个实现方案已设计
- 测试策略已制定
- 文档已生成

⏳ **实现阶段**（接下来）
- [ ] 运行 PROBE 确认 SDK API
- [ ] 选择实现方案
- [ ] 补完 kite-aa.ts
- [ ] 通过 typecheck
- [ ] 测试 EOA 获得 txHash
- [ ] 测试 AA 获得 userOpHash
- [ ] 填充 for_judge.md

---

## 📞 如需帮助

提供以下信息：
1. PROBE 输出的 SDK 导出列表
2. 完整的错误堆栈
3. 运行的完整命令
4. `.env` 配置（隐藏敏感信息）

---

## 📝 更新历史

| 日期 | 内容 | 状态 |
|------|------|------|
| 2026-01-29 | 现有代码分析 + 框架设计 | ✅ 完成 |
| 2026-01-29 | 创建 3 份实现指南文档 | ✅ 完成 |
| - | 实现 sendErc20ViaAA() | ⏳ 待做 |
| - | 测试 EOA 路径获取 txHash | ⏳ 待做 |
| - | 测试 AA 路径获取 userOpHash | ⏳ 待做 |

---

## 🏁 最后的建议

1. **先不要实现，先探测**
   - 运行 `PROBE_KITE_AA=1 pnpm demo:pay`
   - 确认 SDK 的实际导出再开始写代码

2. **从 EOA 开始测试**
   - 更简单，没有 bundler 依赖
   - 先确保 token 转账能工作
   - 再开始 AA 的复杂流程

3. **充分利用日志**
   - 在关键步骤添加 `console.log`
   - 方便调试与理解流程

4. **保留参考代码**
   - ARCHITECTURE.md 中的参考框架
   - QUICK_REFERENCE.md 中的命令
   - 需要时直接复制使用

---

**现在就开始！** 🚀

```bash
cd /home/user/AgentPayGuard
PROBE_KITE_AA=1 pnpm demo:pay
```

回来后记录输出，我们就能确定最终的实现方案了！
