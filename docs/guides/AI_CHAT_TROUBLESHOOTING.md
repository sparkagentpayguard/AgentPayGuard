# AI Chat 故障排查指南

> **问题**：为什么 AI 聊天功能容易触发 fallback（回退）？

---

## 常见 Fallback 原因

### 1. AI 未启用或配置错误 ⚠️

**症状**：所有请求都直接使用 fallback，返回通用回复

**检查方法**：
```bash
# 检查环境变量
grep ENABLE_AI_INTENT .env
grep -E "(DEEPSEEK|GEMINI|OPENAI|CLAUDE)_API_KEY" .env
```

**解决方案**：
1. 设置 `ENABLE_AI_INTENT=1` 在 `.env` 文件中
2. 配置至少一个 AI API Key：
   - `DEEPSEEK_API_KEY=...` （推荐，免费额度）
   - `GEMINI_API_KEY=...` （免费额度）
   - `OPENAI_API_KEY=...` （付费）
   - `CLAUDE_API_KEY=...` （付费）

**日志示例**：
```
[api/ai-chat] AI status check: enabled=false, provider=none, model=, hasClient=false
[api/ai-chat] Diagnostic: ENABLE_AI_INTENT=false, provider=none, hasClient=false
```

---

### 2. 输入验证失败（Prompt Injection 检测）🛡️

**症状**：某些消息触发 fallback，日志显示 "Input validation failed"

**常见触发模式**：
- `ignore previous instructions`
- `forget all rules`
- `system: you are`
- `[INST]` 或 `[/INST]`
- `you must always`
- `reveal your prompt`

**解决方案**：
- 避免在消息中使用上述模式
- 如果确实需要讨论这些内容，可以：
  1. 修改 `src/lib/prompt-injection.ts` 放宽检测规则
  2. 或使用 `allowInjection: true` 选项（仅记录警告，不拒绝）

**日志示例**：
```
[AIChatOrchestrator] Input validation failed: Prompt injection detected: Ignore previous instructions
[AIChatOrchestrator] Using fallback due to input validation failure
```

---

### 3. AI API 调用失败（超时、网络错误）🌐

**症状**：日志显示 "classify failed after retries"，错误信息包含 timeout、network、API 等关键词

**常见原因**：
- **超时**：AI API 响应时间超过 30 秒（默认 `AI_TIMEOUT_MS=30000`）
- **网络错误**：无法连接到 AI API 服务器
- **API Key 无效**：401 Unauthorized 错误
- **Rate Limit**：429 Too Many Requests 错误
- **模型不存在**：400 Bad Request，Model Not Found

**解决方案**：

1. **增加超时时间**：
   ```bash
   AI_TIMEOUT_MS=60000  # 增加到 60 秒
   ```

2. **检查网络连接**：
   ```bash
   # 测试 DeepSeek API
   curl https://api.deepseek.com/v1/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
   
   # 测试 Gemini API
   curl "https://generativelanguage.googleapis.com/v1/models?key=$GEMINI_API_KEY"
   ```

3. **检查 API Key**：
   - DeepSeek: https://platform.deepseek.com/
   - Gemini: https://makersuite.google.com/app/apikey
   - OpenAI: https://platform.openai.com/api-keys

4. **检查模型名称**：
   ```bash
   # 确保模型名称正确
   AI_MODEL=deepseek-chat  # DeepSeek
   AI_MODEL=gemini-1.5-flash  # Gemini
   AI_MODEL=gpt-4o-mini  # OpenAI
   ```

**日志示例**：
```
[AIChatOrchestrator] Retry attempt 1/3: AI API timeout after 30000ms
[AIChatOrchestrator] Retry attempt 2/3: AI API timeout after 30000ms
[AIChatOrchestrator] classify failed after retries, using fallback
[AIChatOrchestrator] Error type: Error
[AIChatOrchestrator] Error message: AI API timeout after 30000ms
[AIChatOrchestrator] Reason: AI API timeout - consider increasing AI_TIMEOUT_MS or checking network
```

---

### 4. JSON 解析失败 📄

**症状**：日志显示 "JSON parse failed"，AI 返回了非 JSON 格式的响应

**常见原因**：
- AI 模型没有遵循 `response_format: { type: 'json_object' }` 要求
- AI 返回了包含额外文本的响应（如 markdown 代码块）
- AI 返回了格式错误的 JSON

**解决方案**：

1. **检查系统提示词**：确保系统提示词明确要求 JSON 格式输出
2. **使用更可靠的模型**：
   - DeepSeek Chat（推荐）
   - GPT-4o-mini
   - Claude Haiku
3. **降低 temperature**（已默认 0.1）：
   ```bash
   AI_TEMPERATURE=0.1  # 默认值，确保输出更确定
   ```

**日志示例**：
```
[AIChatOrchestrator] Received AI response (1234 chars), parsing JSON...
[AIChatOrchestrator] JSON parse failed: SyntaxError: Unexpected token 'I' in JSON at position 0
[AIChatOrchestrator] Response content: I am AgentPayGuard assistant...
[AIChatOrchestrator] Reason: Invalid JSON response from AI - AI may not be following response_format
```

---

### 5. 输入长度超限 📏

**症状**：日志显示 "Input too long"，消息超过 1000 字符限制

**解决方案**：
- 缩短消息长度
- 或修改 `src/lib/ai-chat.ts` 中的 `maxLength` 参数（不推荐，可能影响性能）

**日志示例**：
```
[AIChatOrchestrator] Input validation failed: Input too long: 1500 characters (max: 1000)
```

---

## 诊断步骤

### 步骤 1：检查 AI 配置状态

查看服务器启动日志：
```bash
pnpm server
# 或
npx tsx src/server.ts
```

查找以下日志：
```
[AgentPayGuard API] modules preloaded, AI parser initialized
```

### 步骤 2：检查 API 调用日志

发送一条消息后，查看服务器日志，查找：
```
[AIChatOrchestrator] Classifying message: "..."
[AIChatOrchestrator] Input validation passed
[AIChatOrchestrator] Calling AI API: model=..., temperature=...
[AIChatOrchestrator] Received AI response (... chars), parsing JSON...
[AIChatOrchestrator] Classification successful: action=...
```

如果看到以下日志，说明触发了 fallback：
```
[AIChatOrchestrator] classify failed after retries, using fallback
[AIChatOrchestrator] Error type: ...
[AIChatOrchestrator] Error message: ...
[AIChatOrchestrator] Reason: ...
```

### 步骤 3：测试 AI API 连接

```bash
# 测试 DeepSeek（如果配置了）
curl https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY"

# 测试 Gemini（如果配置了）
curl "https://generativelanguage.googleapis.com/v1/models?key=$GEMINI_API_KEY"
```

### 步骤 4：检查环境变量

```bash
# 检查关键配置
cat .env | grep -E "(ENABLE_AI_INTENT|DEEPSEEK|GEMINI|OPENAI|CLAUDE|AI_MODEL|AI_TIMEOUT)"
```

---

## 优化建议

### 1. 使用更快的模型

```bash
# DeepSeek（推荐，免费且快速）
DEEPSEEK_API_KEY=your-key
AI_MODEL=deepseek-chat

# Gemini Flash（免费且快速）
GEMINI_API_KEY=your-key
AI_MODEL=gemini-1.5-flash
```

### 2. 调整超时和重试参数

```bash
# 增加超时时间（如果网络较慢）
AI_TIMEOUT_MS=60000

# 限制输出长度（加快响应）
AI_MAX_TOKENS=500

# 降低 temperature（更快更确定）
AI_TEMPERATURE=0.1
```

### 3. 启用缓存

缓存已自动启用（5分钟 TTL），相同消息会直接返回缓存结果。

### 4. 使用本地模型（可选）

```bash
# Ollama（完全免费，本地运行）
OLLAMA_URL=http://localhost:11434/v1
AI_MODEL=llama3.2

# 或 LM Studio
LMSTUDIO_URL=http://localhost:1234/v1
AI_MODEL=local-model
```

---

## 常见错误码对照表

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `AI API timeout` | 超时 | 增加 `AI_TIMEOUT_MS` 或检查网络 |
| `Invalid JSON response` | JSON 解析失败 | 检查模型是否支持 `json_object` 格式 |
| `401 Unauthorized` | API Key 无效 | 检查 API Key 是否正确 |
| `429 Too Many Requests` | Rate Limit | 等待后重试，或使用其他 API Key |
| `Model Not Found` | 模型名称错误 | 检查 `AI_MODEL` 配置 |
| `Prompt injection detected` | 输入验证失败 | 避免使用可疑模式，或放宽检测规则 |
| `Input too long` | 消息过长 | 缩短消息长度 |

---

## 调试模式

启用详细日志：
```bash
# 查看所有 AI 相关日志
DEBUG=* pnpm server

# 或直接查看服务器输出
npx tsx src/server.ts
```

---

**最后更新**: 2026-01-31
