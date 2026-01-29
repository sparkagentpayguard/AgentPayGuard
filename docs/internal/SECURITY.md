# 安全政策 (Security Policy)

本文档规定了 AgentPayGuard 项目的安全规则和最佳实践。

---

## 🔐 关键规则

### 1. 禁止共享敏感信息

**禁止的行为**：
- ❌ 在 Git 或任何版本控制中提交 `.env` 文件
- ❌ 在代码审查、Issue、PR 中分享私钥
- ❌ 向 AI Assistant 或任何外部工具提供 `.env` 内容
- ❌ 在讨论、文档、日志中暴露真实的 RPC 密钥、API Key
- ❌ 在截图或录屏中显示私钥信息

**敏感信息清单**：
- `PRIVATE_KEY` - 钱包私钥
- `MNEMONIC` - 助记词（如有）
- `API_KEY` - 任何 API 密钥
- `RPC_URL` - 内网或付费 RPC 端点（如有限制）
- `.env` 及其所有变体（`.env.local`、`.env.production` 等）

---

## ✅ 安全做法

### 配置管理

```bash
# 1. 确保 .env 在 .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# 2. 设置文件权限（仅所有者可读写）
chmod 600 .env

# 3. 使用 .env.example 作为公开模板
cp .env .env.example
# 然后编辑 .env.example，替换所有敏感值为占位符
```

### 与 AI Assistant 的交互

**安全交互方式**：
- ✅ 只讨论 `.env.example`（无真实数据）
- ✅ 描述需要什么字段和格式
- ✅ 讨论代码逻辑，不涉及实际值
- ✅ 如果需要共享配置，用占位符：`0x<ADDRESS>`、`sk_<KEY>`、`https://...`

**不安全的做法**：
- ❌ 复制粘贴 `.env` 内容给 AI
- ❌ 在聊天中分享真实私钥
- ❌ 上传包含 `.env` 的项目快照

---

## 🚫 AI Assistant 规则

### 自动安全防护

我（AI Assistant）承诺：
- **永不读取** 任何 `.env*` 文件（基于文件名匹配）
- **自动拒绝** 对敏感文件的任何读取请求
- **提醒用户** 安全规则和最佳实践
- **不存储** 任何私钥或密钥信息

### 文件名黑名单

以下文件我不会主动读取或处理，即使被明确要求：
```
.env
.env.local
.env.*.local
.env.production
.env.staging
.env.test
.env.development
```

---

## 📋 预检清单（Pre-Commit）

在提交代码前，运行以下检查：

```bash
# 1. 检查 .env 是否被意外暴露
git diff --cached | grep -i "private_key\|api_key\|secret"

# 2. 确认 .env 在 .gitignore 中
grep -E "^\.env" .gitignore

# 3. 确认文件权限
ls -la .env | grep "^-rw-------"  # 应该显示 600

# 4. 确认没有提交敏感文件
git ls-files | grep "\.env"  # 应该无输出
```

---

## 🔔 如果你发现敏感信息被泄露

**立即行动**：

1. **停止使用该密钥**
   ```bash
   # 如果是钱包私钥，立即转移资金到安全钱包
   # 如果是 API Key，立即轮换或删除
   ```

2. **从 Git 历史中移除**
   ```bash
   # 使用 git-filter-branch 或 BFG Repo-Cleaner
   # 这是高级操作，谨慎执行
   ```

3. **通知团队**
   - 告知所有对项目有访问权限的人
   - 更新所有备份和克隆

4. **更新文档**
   - 在 SECURITY.md 中记录事件
   - 增强安全检查

---

## 🛡️ 环境变量加载（安全方式）

**推荐做法**：

```typescript
// src/lib/config.ts - 只在运行时加载，不在构建时
import dotenv from 'dotenv';

dotenv.config();  // 从 .env 加载

const config = {
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: process.env.RPC_URL!,
  // ... 其他配置
};

// ❌ 永远不要导出 config，只在内部使用
// ❌ 永远不要在日志中打印 config
export async function getSigner() {
  // config 在此函数内使用，不暴露给外部
  return new ethers.Wallet(config.privateKey, provider);
}
```

---

## 📝 代码审查检查清单

Reviewer 应该检查：

- [ ] 是否有新的 `.env*` 文件被提交
- [ ] 是否在代码中硬编码了私钥
- [ ] 是否在日志、错误消息中暴露敏感信息
- [ ] `.env.example` 是否已更新且无真实数据
- [ ] 是否有 `PRIVATE_KEY`、`API_KEY` 等敏感词出现在非 `.env` 文件中

---

## 📚 参考资源

- [Git 安全最佳实践](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work)
- [OWASP - Secrets Management](https://owasp.org/www-community/attacks/Key_Management)
- [ethers.js - 安全实践](https://docs.ethers.org/v6/getting-started/)

---

## 版本历史

| 日期 | 更新内容 |
|:---|:---|
| 2026-01-30 | 初版：添加 AI Assistant 安全规则、文件名黑名单 |

---

**所有团队成员都应该阅读并遵守本文档。** ⚠️

如有任何安全相关问题，请立即上报。
