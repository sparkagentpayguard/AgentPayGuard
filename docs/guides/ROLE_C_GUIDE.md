# Role C 指南：前端 Web UI 开发与可视化

> **📌 声明**：本指南仅为参考。Role C 可以根据实际情况、创意和时间约束选择自己的开发方案。如果决定不开发 Web UI，可以选择其他形式（如增强演讲、优化演示、补充文档等）展示成果。无需严格遵循本指南。

本指南为 Role C (前端开发负责人) 提供完整的工作流程：开发科技感的 Web UI，展示链上支付、策略校验、权限控制的完整流程。

---

## 概览

### 目标（升级版：从编译→前端开发）

1. **开发 Web UI** - 构建科技感强、交互流畅的支付界面
2. **数据可视化** - 展示策略规则、Tx 状态、多签信息的实时反馈
3. **完整演示流程** - 在一个界面内展示正常支付、拒绝、多签冻结的全链路
4. **生成评委证据** - 视频或截图展示功能，更新 for_judge.md

### 赛道要求对应

| 行号 | 赛道要求 | 证据来源 | Role C 任务 |
|------|---------|--------|-----------|
| 1 | 链上支付 | Role B (EOA Tx) | 填入 Tx Hash + 浏览器链接 |
| 2 | Agent 身份 | Role B (AA Tx) | 填入 UserOp Hash + Settlement Tx + 说明 |
| 3 | 权限控制 | Role A (冻结 Tx) | 填入冻结 Tx Hash + 多签地址 + 拒绝案例 |
| 4 | 可复现性 | 代码实现 | 填入命令、源码路径、干运行截图 |

### 赛道要求对应

| 行号 | 赛道要求 | 实现方式 | Role C 展示 |
|------|---------|--------|-----------|
| 1 | 链上支付 | Web UI 点击提交 → 实时显示 Tx Hash 和确认 | ✨ 动画确认反馈 |
| 2 | Agent 身份 | Web UI 切换 EOA/AA 模式 → 显示 UserOp 流程 | ✨ 流程可视化 |
| 3 | 权限控制 | Web UI 展示白名单校验 → 演示拒绝和冻结 | ✨ 状态指示器 |
| 4 | 可复现性 | 完整的源代码 + Web UI 源码 | ✨ 代码窗格展示 |

---

## 🎨 前端亮眼方案（科技感设计）

### 推荐技术栈

**React 18 + TypeScript + Tailwind CSS + Vite + Framer Motion**

原因：开发速度快（2-3 小时完成基础 UI），样式易操作，动画库成熟，最容易展现"科技感"。

### 核心亮眼功能

#### 功能 1：支付操作面板（带动画反馈）
- **深色主题**：渐变背景（深蓝→紫色）
- **实时反馈**：
  - 点击"发起支付" → 按钮变圆形加载动画（Framer Motion）
  - Tx 确认 → 绿色 ✓ 从左到右扫过（0.5 秒）
  - 结果面板从下方滑入（0.3 秒）
- **实时轮询**：每 2 秒自动查询 Tx 状态，显示确认数
- **一键复制**：Tx Hash 点击可复制到剪贴板

#### 功能 2：策略校验可视化（进度条 + 即时反馈）
- **白名单检查**：输入地址时实时判断，✓ 或 ✗ 颜色变化
- **限额进度条**：用颜色表示使用率（绿→黄→红）
- **拒绝动画**：非白名单地址时，输入框抖动 + 红色报错信息
- **三卡片并排**：白名单、限额、有效期规则清晰展示

#### 功能 3：多签冻结面板（权限透视）
- **成员展示**：头像 + 地址，视觉清晰
- **阈值圆形进度**：显示 2/3 的签名状态
- **时间线**：冻结操作显示为时间轴，支持展开查看详情
- **交互链接**：点击 Tx Hash 直接打开 Kite 浏览器

#### 功能 4：完整流程展示（可选，加分项）
- **SVG 动画**：展示数据流（Policy → EOA/AA → Kite Chain）
- **实时同步**：发起支付时，动画沿着路径流动
- **颜色反馈**：成功路径绿色，拒绝路径红色

### 美观度加分项

- 🎯 **响应式设计**：支持桌面、平板、手机
- 🎯 **深色模式**：默认深色主题，展现科技感
- 🎯 **流畅动画**：使用 Framer Motion 实现页面过渡
- 🎯 **图表展示**：可选添加 ECharts 展示策略统计
- 🎯 **代码窗口**：展示核心代码片段（如策略规则）
- 🎯 **加载骨架屏**：数据加载时显示骨架，不是空白

---

## 开发步骤

### 1. 等待 Role B 的交付物

Role B 需要运行链上测试并提供：

```bash
# Role B 执行这两个命令（已在 TESTING_GUIDE.md 中）
PAYMENT_MODE=eoa EXECUTE_ONCHAIN=1 pnpm demo:pay
PAYMENT_MODE=aa EXECUTE_ONCHAIN=1 pnpm demo:pay
```

**Role B 应该交付给你**：
- ✅ EOA Tx Hash（格式：`0x...`，64 字符）
- ✅ AA Settlement Tx Hash（格式：`0x...`，64 字符）
- ✅ Kite 浏览器链接（两个 Tx 各一个）
- ✅ 两个 Tx 的截图（展示确认和金额）

### 2. 等待 Role A 的交付物

Role A 需要部署多签并执行冻结，提供：

```bash
# Role A 执行（见 ROLE_A_GUIDE.md）
# 1. 创建 Gnosis Safe 多签钱包
# 2. 部署 TokenGuard 权限管理合约
# 3. 执行冻结交易
```

**Role A 应该交付给你**：
- ✅ 多签钱包地址（格式：`0x...`）
- ✅ 冻结 Tx Hash（格式：`0x...`，64 字符）
- ✅ Kite 浏览器链接（冻结 Tx）
- ✅ 多签成员清单（截图或 JSON）
- ✅ TokenGuard 合约地址（可选但有用）

### 3. 准备开发工具

```bash
# 图片编辑（可选，制作演示截图）
# macOS: Cmd+Shift+5 截图
# Windows: Win+Shift+S 或 Snagit
# Linux: gnome-screenshot 或 flameshot

# 视频录制工具
# macOS: QuickTime Player
# Windows: OBS Studio 或 ShareX
# Linux: OBS Studio 或 SimpleScreenRecorder

# 文本编辑
# VS Code, 或直接编辑 markdown
```

---

## 任务 1：等待并收集交付物

### Step 1: 通知 Role A 和 B

发送提醒消息：

```
【Role B】请尽快完成链上测试：
- 运行：EXECUTE_ONCHAIN=1 pnpm demo:pay (EOA 模式)
- 运行：EXECUTE_ONCHAIN=1 pnpm demo:pay (AA 模式)
- 交付：两个 Tx Hash + 浏览器链接 + 截图

【Role A】请尽快部署多签和执行冻结：
- 参考：docs/guides/ROLE_A_GUIDE.md
- 交付：多签地址 + 冻结 Tx Hash + 浏览器链接 + 成员清单

截止日期：2026-02-01 18:00 UTC
```

### Step 2: 创建收集表

在你的本地创建文件 `evidence_collected.md`（供自己跟踪，不提交 Git）：

```markdown
# 证据收集进度

## Role B (支付)

- [x] EOA Tx Hash: 0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db
- [x] EOA 浏览器链接: https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db
- [ ] EOA 截图: _________________
- [x] AA Settlement Tx Hash: 0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313
- [x] AA 浏览器链接: https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313
- [ ] AA 截图: _________________

## Role A (多签)

- [ ] 多签地址: _________________
- [ ] 冻结 Tx Hash: _________________
- [ ] 冻结浏览器链接: _________________
- [ ] 多签成员清单: _________________
- [ ] 多签截图: _________________

## 状态
- 等待中：__/__
- 已收集：__/__
```

### Step 3: 追踪和催促

```bash
# 每天检查一次
# 如果截止日期前 24 小时还没收到：
# - 发送紧急提醒
# - 询问是否有技术问题
# - 提供调试帮助（指向 TESTING_GUIDE.md 的故障排除）
```

---

## 任务 2：填充 for_judge.md

当 Role A 和 B 的交付物都收到后，开始编辑 `docs/for_judge.md`。

### for_judge.md 的 4 行表格结构

```markdown
| # | 赛道要求 | 实现方案 | 验证方式 | 证据 |
|---|--------|--------|--------|------|
| 1 | 链上支付 | ERC-20 稳定币转账 | 交易执行 + Tx Hash | [0xB_EOA...](链接) |
| 2 | Agent身份 | ERC-4337 AA + Bundler | UserOp 执行 | [0xB_AA...](链接) |
| 3 | 权限控制 | 多签 + 冻结合约 | 拒绝演示 + 冻结 Tx | [0xA_FREEZE...](链接) |
| 4 | 可复现性 | 源代码 + Demo 脚本 | 干运行通过 | [pnpm demo:pay](源码链接) |
```

### 逐行填充指南

#### 第 1 行：链上支付

```markdown
| 1 | 链上支付 | Role B 使用 ethers.js + 钱包执行 ERC-20 transfer | 交易确认 | [Tx Hash: 0xB_EOA...](https://testnet.kite.ai/tx/0xB_EOA...) |
```

**需要填入的内容**：
- 实现方案：简要说明（来自 src/demo-pay.ts）
- 验证方式：链上可验证
- 证据：Tx Hash（来自 Role B）+ Kite 浏览器链接

**检查清单**：
- [ ] Tx Hash 以 0x 开头，64 字符
- [ ] 链接有效（可在浏览器中打开）
- [ ] 浏览器显示"Status: Success"
- [ ] 显示转账金额（例如：100 USDC）

#### 第 2 行：Agent 身份

```markdown
| 2 | Agent身份 | Role B 使用 gokite-aa-sdk v1.0.14 创建 ERC-4337 UserOperation，通过 Bundler 执行 | UserOp 提交 + Settlement Tx 确认 | [Tx Hash: 0xB_AA...](https://testnet.kite.ai/tx/0xB_AA...) |
```

**需要填入的内容**：
- 实现方案：提及 SDK 版本、Bundler、ERC-4337 标准
- 验证方式：UserOp Hash + Settlement Tx（最终结算交易）
- 证据：Settlement Tx Hash（来自 Role B）+ 链接

**检查清单**：
- [ ] Settlement Tx Hash（最终链上 Tx，非 UserOp Hash）
- [ ] 链接有效，显示"Status: Success"
- [ ] 发送方为 AA Account 地址（格式：`0x...`）
- [ ] 接收方为预期的收款地址

#### 第 3 行：权限控制

```markdown
| 3 | 权限控制 | Role A 部署 Gnosis Safe 多签钱包（2/3 阈值），执行 TokenGuard 冻结合约，演示拒绝 | 多签执行 + pnpm demo:reject 拒绝演示 | [Freeze Tx: 0xA...](https://testnet.kite.ai/tx/0xA...) + [拒绝案例](docs/guides/TESTING_GUIDE.md#场景-5-政策拒绝---非白名单收款方) |
```

**需要填入的内容**：
- 实现方案：多签选型（Gnosis Safe）、冻结机制
- 验证方式：多签执行 Tx + 拒绝演示脚本
- 证据：冻结 Tx Hash + 拒绝案例链接

**检查清单**：
- [ ] 冻结 Tx Hash（来自 Role A）
- [ ] 链接有效，显示冻结操作
- [ ] 多签成员数 >= 2
- [ ] pnpm demo:reject 输出包含 "NOT_IN_ALLOWLIST"

#### 第 4 行：可复现性

```markdown
| 4 | 可复现性 | 提供完整源代码（src/lib/kite-aa.ts + src/lib/policy.ts）+ 演示脚本（demo:pay / demo:reject）+ 干运行通过（pnpm typecheck: 0 errors） | 一键执行 pnpm demo:pay / demo:reject，5 分钟内看到结果 | [源码](src/lib/kite-aa.ts) + [脚本](src/demo-pay.ts) + [干运行](docs/guides/TESTING_GUIDE.md#场景-1-干运行-dry-run---eoa-支付) |
```

**需要填入的内容**：
- 实现方案：源代码文件、脚本、编译验证
- 验证方式：一键运行，快速反馈
- 证据：代码链接 + 干运行输出截图

**检查清单**：
- [ ] src/lib/kite-aa.ts 存在且包含 sendErc20ViaAA 函数
- [ ] src/demo-pay.ts 存在
- [ ] pnpm typecheck 返回 0 errors
- [ ] pnpm demo:pay 和 demo:reject 都能运行
- [ ] 干运行输出中显示 "[POLICY_VALIDATION] ✓"

---

## 任务 3：生成演示资料

### 选项 A：截图演示（推荐快速方案）

```bash
# 1. 运行干运行演示
pnpm demo:pay      # 截图关键输出部分
pnpm demo:reject   # 截图拒绝信息

# 2. 收集链上 Tx 截图
# 访问 https://testnet.kite.ai/tx/0xB_EOA...
# 截图：Status、From、To、Amount、Block

# 3. 收集多签截图
# 访问 Gnosis Safe 界面
# 截图：多签成员、阈值、最近交易
```

### 选项 B：演示视频（推荐完整方案）

```bash
# 1. 准备脚本
cat > demo_script.md << 'EOF'
## Demo 演示脚本（3-5 分钟）

### 第 1 部分：代码讲解（1 分钟）
- 打开 src/lib/kite-aa.ts
- 指向 sendErc20ViaAA 函数（104 行）
- 说明：SDK 初始化 → 编码 callData → 签名 → 发送 UO → 轮询状态

### 第 2 部分：干运行演示（1 分钟）
- 运行：pnpm demo:pay
- 显示输出：[POLICY_VALIDATION] ✓ 、[DRY_RUN] Would transfer...
- 说明：无链上交易，逻辑验证成功

### 第 3 部分：政策拒绝演示（30 秒）
- 运行：pnpm demo:reject
- 显示输出：[POLICY_VALIDATION] ✗ NOT_IN_ALLOWLIST
- 说明：白名单强制，非授权地址被拒

### 第 4 部分：链上证据（1.5 分钟）
- 打开 Kite 浏览器
- 查询 EOA Tx Hash：显示转账成功、金额、确认
- 查询 AA Tx Hash：显示 UserOp 执行、Settlement Tx、确认
- 查询冻结 Tx Hash：显示多签执行、冻结状态

### 第 5 部分：总结（30 秒）
- 口播：满足 4 个赛道要求
- 展示 for_judge.md 4 行表格（所有 Tx Hash 已填）
EOF

# 2. 使用录屏工具
# macOS:
#   QuickTime Player → File → New Screen Recording
#   或 Cmd+Shift+5 → 录屏

# Windows:
#   Win+G 打开 Xbox Game Bar
#   或下载 OBS Studio

# Linux:
#   OBS Studio 或 SimpleScreenRecorder

# 3. 录屏设置
#   - 分辨率：1920x1080 或 1280x720（不用太高）
#   - 帧率：30 fps（足够清晰）
#   - 时长：3-5 分钟（评委时间有限）

# 4. 编辑和字幕
# 使用 DaVinci Resolve（免费）或 Adobe Premiere
# - 剪辑无用部分（卡顿、重新开始）
# - 加字幕：标注关键输出
# - 加高亮：用截图或箭头指示重点
# - 配音：解释演示中每个步骤

# 5. 导出
# 格式：MP4（H.264 codec）
# 文件大小：< 200 MB（便于分享）
```

### 制作演示视频的关键点

1. **声音清晰** - 用外接麦克风或安静的环境
2. **语速适中** - 给评委反应时间
3. **字幕辅助** - 补充关键信息（不是所有音都能听清）
4. **视觉强调** - 用颜色框、箭头指示重点部分
5. **时间控制** - 3-5 分钟，不超过 5 分钟

---

## 任务 4：生成证据索引

Role D 需要一份清晰的证据汇总，用于制作 PPT 和讲稿。创建文件 `docs/EVIDENCE_INDEX.md`：

```markdown
# 证据索引（Evidence Index）

## 赛道要求对照

| # | 要求 | 类别 | 证据链接 | Tx/地址 | 备注 |
|---|------|------|---------|--------|------|
| 1 | 链上支付 | ERC-20 转账 | [Kite 浏览器](https://testnet.kite.ai/tx/0xB_EOA...) | 0xB_EOA... | 金额：100 USDC |
| 2 | Agent 身份 | ERC-4337 AA | [Kite 浏览器](https://testnet.kite.ai/tx/0xB_AA...) | 0xB_AA... | 通过 Bundler 执行 |
| 3 | 权限控制 | 多签冻结 | [Kite 浏览器](https://testnet.kite.ai/tx/0xA...) | 0xA... | Gnosis Safe 2/3 |
| 4 | 可复现性 | 源代码 | [GitHub](src/lib/kite-aa.ts) | - | 104 行完整实现 |

## 关键地址和 Hash

### 支付相关
- **EOA Payment Tx**: `0xB_EOA...`
- **AA Settlement Tx**: `0xB_AA...`
- **Owner EOA**: `0x...` (来自 .env)
- **AA Account**: `0x...` (派生自 SDK)
- **USDC Token**: `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`

### 多签相关
- **Multisig Wallet**: `0xA...`
- **TokenGuard Contract**: `0x...`
- **Freeze Tx**: `0xA...`
- **Members**: 
  - Member 1: `0x...`
  - Member 2: `0x...`
  - Member 3: `0x...`
- **Threshold**: 2/3

## 演示资料

- 干运行截图：[docs/screenshots/dry-run.png]
- 拒绝演示截图：[docs/screenshots/reject.png]
- 链上 Tx 截图：[docs/screenshots/tx-eoa.png], [docs/screenshots/tx-aa.png]
- 演示视频：[docs/videos/demo-3min.mp4] (或优酷/B站链接)

## 代码链接

| 文件 | 用途 | 行数 |
|------|------|------|
| src/lib/kite-aa.ts | ERC-4337 实现 | 104 |
| src/lib/policy.ts | 策略校验 | ~50 |
| src/demo-pay.ts | 支付演示脚本 | ~30 |
| src/demo-reject.ts | 拒绝演示脚本 | ~20 |

## 时间轴

- **2026-01-31**: Role B 和 A 完成链上操作，交付 Tx Hash ✅
- **2026-02-01**: Role C 填充 for_judge.md，生成演示资料 ✅
- **2026-02-02**: Role D 收集此索引，开始制作 PPT
- **2026-02-04**: 最终 PPT 和讲稿完成
- **2026-02-05+**: 评审 + 演示 + 答辩
```

---

## 检查清单（Role C 自查）

在提交给 Role D 之前，确认以下项目：

```bash
# for_judge.md 检查
- [ ] 4 行表格全部填满，无占位符（如 0xTODO）
- [ ] 所有 Tx Hash 格式正确（0x 开头，64 字符）
- [ ] 所有浏览器链接有效（可点击打开）
- [ ] 每行都有明确的实现方案和证据

# 演示资料检查
- [ ] 干运行脚本能运行（pnpm demo:pay / demo:reject）
- [ ] 演示视频已录制（或截图已准备）
- [ ] 视频质量清晰（分辨率 >= 720p）
- [ ] 时长合理（3-5 分钟）
- [ ] 有字幕或声音讲解

# 证据索引检查
- [ ] EVIDENCE_INDEX.md 包含所有 Tx Hash 和地址
- [ ] 所有浏览器链接都有效
- [ ] 代码链接指向正确的文件和行号
- [ ] 时间轴清晰，截止日期明确

# Git 提交检查
- [ ] for_judge.md 已提交（git status 干净）
- [ ] 演示视频或截图已上传（或链接可用）
- [ ] EVIDENCE_INDEX.md 已提交
- [ ] commit message 清晰："Phase 14: for_judge.md filled with all Tx Hash"
```

---

## 常见问题

### Q1：Role B 没有及时交付 Tx Hash 怎么办？

**A**：
1. 先填充其他 3 行（Agent 身份、权限控制、可复现性）
2. 保留第 1 行（链上支付）为空或用占位符
3. Role B 交付后立即补上
4. 最迟 2026-02-01 中午前必须全部填满

### Q2：Tx Hash 在浏览器中查不到怎么办？

**A**：
1. 检查是否使用了正确的网络（Kite 测试网）
2. 检查 Tx Hash 格式（应该以 0x 开头）
3. 等待 1-2 分钟（刚发送的 Tx 可能还未入块）
4. 查看原始 pnpm demo:pay 的输出，确认 Tx Hash 正确
5. 如果还是找不到，问 Role B 是否真的执行了链上交易

### Q3：演示视频太大怎么办？

**A**：
1. 降低分辨率（1280x720 而不是 1920x1080）
2. 降低帧率（24 fps 而不是 30 fps）
3. 压缩视频（用 ffmpeg 或视频编辑软件）
4. 示例：
   ```bash
   ffmpeg -i demo.mp4 -vcodec h264 -acodec aac -crf 23 demo_compressed.mp4
   ```
5. 或者上传到 YouTube/B站，分享链接而不是文件

---

## 提交指令

当所有工作完成时，执行：

```bash
cd /home/user/AgentPayGuard

# 1. 更新工作日志
# （Agent 会做）

# 2. 提交 for_judge.md 和证据索引
git add docs/for_judge.md docs/EVIDENCE_INDEX.md
git commit -m "Phase 14: for_judge.md filled with all Tx Hash and evidence links"
git push

# 3. 通知 Role D
echo "✅ for_judge.md 已完成，证据索引已生成，可以开始制作 PPT"
```

---

**指南版本**：1.0  
**最后更新**：2026-01-30  
**作者**：AI Assistant (Copilot)
