# 🗂️ 角色 B 实现文件索引

**最后更新**：2026-01-29  
**负责人**：Sulla（后端 / AA 集成）

---

## 📍 文件导航地图

### 🎯 **立即开始（3 个文件）**

1. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** ⭐ START HERE
   - 📄 5 分钟快速了解全貌
   - 📋 交付物清单
   - 🚀 立即下一步清单
   - ✅ 成功指标

2. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** ⭐ 常用查询
   - 🔍 命令速查表
   - 🐛 常见错误速查
   - 📝 参数配置模板
   - 📊 进度追踪

3. **[ROLE_B_IMPLEMENTATION.md](ROLE_B_IMPLEMENTATION.md)** ⭐ 详细指南
   - 📖 现有代码分析（第一阶段）
   - 💡 实现框架与方案（第二阶段）
   - 🧪 测试策略（第三阶段）
   - 📝 常见问题解决（参考）

### 🏗️ **深入理解（补充文档）**

4. **[ARCHITECTURE.md](ARCHITECTURE.md)**
   - 🎨 整体架构可视化图
   - 🔄 EOA vs AA 流程对比
   - 💻 完整参考代码框架
   - 🔑 SDK API 猜测说明

---

## 🎬 推荐阅读顺序

### **如果你有 10 分钟**
1. 读 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. 读 [QUICK_REFERENCE.md](QUICK_REFERENCE.md) 命令部分

### **如果你有 30 分钟**
1. 读 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) （5 分钟）
2. 读 [ARCHITECTURE.md](ARCHITECTURE.md) （15 分钟）
3. 读 [ROLE_B_IMPLEMENTATION.md](ROLE_B_IMPLEMENTATION.md) 前 2 章 （10 分钟）

### **如果你有 1 小时**
1. 读 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) （5 分钟）
2. 读 [ARCHITECTURE.md](ARCHITECTURE.md) （15 分钟）
3. 完整读 [ROLE_B_IMPLEMENTATION.md](ROLE_B_IMPLEMENTATION.md) （30 分钟）
4. 收藏 [QUICK_REFERENCE.md](QUICK_REFERENCE.md) 作为查阅表 （10 分钟）

---

## 🔍 按需快速查询

### 我想...

**...知道接下来做什么**
→ [IMPLEMENTATION_SUMMARY.md - 立即下一步](IMPLEMENTATION_SUMMARY.md#%EF%B8%8F-%E7%AB%8B%E5%8D%B3%E4%B8%8B%E4%B8%80%E6%AD%A5)

**...查看代码流程对比**
→ [ARCHITECTURE.md - 代码流程对比](ARCHITECTURE.md#代码流程对比)

**...运行某个命令**
→ [QUICK_REFERENCE.md - 测试命令速查](QUICK_REFERENCE.md#-测试命令速查)

**...解决某个错误**
→ [QUICK_REFERENCE.md - 常见错误速查](QUICK_REFERENCE.md#-常见错误速查)

**...了解 SDK API**
→ [ARCHITECTURE.md - GokiteAASDK API 猜测](ARCHITECTURE.md#gokiteaasdk-api-猜测)

**...看完整的参考代码**
→ [ARCHITECTURE.md - 完整的实现框架](ARCHITECTURE.md#完整的实现框架参考)

**...理解两个实现方案**
→ [ROLE_B_IMPLEMENTATION.md - 第四步：sendErc20ViaAA 完整实现框架](ROLE_B_IMPLEMENTATION.md#-第四步sendErc20ViaAA-完整实现框架)

**...看测试步骤**
→ [QUICK_REFERENCE.md - 测试命令速查](QUICK_REFERENCE.md#-测试命令速查) 或
[ROLE_B_IMPLEMENTATION.md - 测试策略](ROLE_B_IMPLEMENTATION.md#-测试策略)

**...获得成功指标**
→ [ROLE_B_IMPLEMENTATION.md - 成功指标](ROLE_B_IMPLEMENTATION.md#-成功指标)

---

## 📊 文档对比表

| 文档 | 类型 | 篇幅 | 用途 | 阅读时间 |
|------|------|------|------|---------|
| IMPLEMENTATION_SUMMARY.md | 总结 | 中 | 快速了解全貌与下一步 | 5-10 分钟 |
| QUICK_REFERENCE.md | 查阅 | 小 | 命令/错误/配置速查 | 2-5 分钟 |
| ARCHITECTURE.md | 深入 | 中 | 架构理解与代码框架 | 15-20 分钟 |
| ROLE_B_IMPLEMENTATION.md | 详细 | 大 | 完整实现指南与方案 | 30-40 分钟 |

---

## 🎯 核心代码位置

### 需要修改的文件
- **[src/lib/kite-aa.ts](src/lib/kite-aa.ts)** 🔴
  - 47 行
  - 需补完 `sendErc20ViaAA()` 函数
  - 参考框架：[ARCHITECTURE.md](ARCHITECTURE.md#完整的实现框架参考)

### 参考实现（已完成）
- **[src/lib/erc20.ts](src/lib/erc20.ts)** ✅
  - 30 行，完整的 EOA 转账实现
  - AA 路径需要类似的编码逻辑

- **[src/demo-pay.ts](src/demo-pay.ts)** ✅
  - 96 行，主程序入口
  - 已预留 AA 路径调用
  - 无需修改

### 测试与配置
- **.env.example** - 环境变量模板
- **for_judge.md** - 评委表（需填 tx hash）
- **package.json** - 已包含 gokite-aa-sdk@^1.0.14

---

## ✅ 检查清单

### 开始前检查
- [ ] 已读过 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- [ ] 了解两个实现方案（A 和 B）的区别
- [ ] 知道下一步是运行 PROBE

### 实现时检查
- [ ] 已运行 `PROBE_KITE_AA=1 pnpm demo:pay` 
- [ ] 已记录 SDK 的实际导出
- [ ] 已确认使用方案 A 还是 B
- [ ] 已参考 [ARCHITECTURE.md](ARCHITECTURE.md) 的框架代码
- [ ] 已通过 `pnpm typecheck`

### 测试时检查
- [ ] 已配置 .env（PRIVATE_KEY, RECIPIENT）
- [ ] Dry run 成功（`pnpm demo:pay`）
- [ ] EOA 测试成功 + 获得 txHash
- [ ] AA 测试成功 + 获得 userOpHash（可选）
- [ ] 已填充 for_judge.md

---

## 🚀 快速启动命令

```bash
# 1. 探测 SDK
cd /home/user/AgentPayGuard
PROBE_KITE_AA=1 pnpm demo:pay

# 2. 类型检查
pnpm typecheck

# 3. Dry run
pnpm demo:pay

# 4. EOA 测试
EXECUTE_ONCHAIN=1 pnpm demo:pay

# 5. AA 测试
PAYMENT_MODE=aa BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/ EXECUTE_ONCHAIN=1 pnpm demo:pay
```

---

## 📞 需要帮助？

1. **快速查询** → [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. **错误解决** → [QUICK_REFERENCE.md - 常见错误](QUICK_REFERENCE.md#-常见错误速查)
3. **代码参考** → [ARCHITECTURE.md - 完整框架](ARCHITECTURE.md#完整的实现框架参考)
4. **流程理解** → [ARCHITECTURE.md - 架构图](ARCHITECTURE.md#整体架构图)
5. **详细方案** → [ROLE_B_IMPLEMENTATION.md](ROLE_B_IMPLEMENTATION.md)

---

**版本**：1.0  
**创建日期**：2026-01-29  
**最后更新**：2026-01-29

---

👉 **现在就开始：[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
