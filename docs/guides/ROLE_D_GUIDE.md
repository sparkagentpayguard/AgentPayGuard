# Role D 指南：支持与最终呈现（PPT/视频）

> **📌 声明**：本指南仅为参考。Role D 可以根据实际创意和时间灵活调整内容，选择自己认为最有效的展示方式。不必拘泥于 PPT 页数、视频时长或任何具体格式要求。创意和有效沟通比标准化流程更重要。

本指南为 Role D (支持/制作负责人) 提供完整的工作流程，从 Role B 和 Role C 的交付物制作最终的 PPT、演示视频等呈现素材。

**⭐ 职责调整说明**：
- **前版本**（已废除）：Role D 负责演讲讲稿 + PPT + 视频
- **当前版本**（新）：Role D 专注于 **PPT 设计 + 视频剪辑**，演讲讲稿由 **Role B** 负责准备和现场讲演
  - Role B 负责：讲稿编写、现场讲演、与代码对应
  - Role D 负责：PPT 美化、视频剪辑、字幕、配音、多媒体呈现
  - Role C 负责：Web UI 制作、数据展示、视觉亮点

---

## 概览

### 目标

1. **制作 PPT 演讲稿** - 10-12 页，包含问题、方案、MVP 演示、对齐分析、证据表
   - 供 Role B 参考讲解（但讲稿内容由 B 准备）
2. **剪辑演示视频** - 1-3 分钟版本（完整演示）+ 10-30 秒版本（高能集锦）
   - 展示 Web UI（Role C）+ 支付演示（Role B）+ 链上证据（Role A）
3. **配音与字幕** - 根据 Role B 的讲稿进行配音或制作字幕
4. **素材归档** - 所有源文件、链接、备注归档到 `docs/` 供后续参考

### 输入和输出

| 阶段 | 输入 | 输出 |
|------|------|------|
| **前置** | Role B 讲稿草稿 + Role C 的 for_judge.md | - |
| **第 1 步** | 讲稿框架 + 证据索引 | PPT 初稿（12 页） |
| **第 2 步** | Web UI 演示视频（来自 C）+ 支付演示（来自 B）| 1-3 分钟剪辑 + 高能 30 秒版 |
| **第 3 步** | 讲稿（来自 B）+ 视频 | 字幕或配音版本 |
| **最终** | PPT + 视频 + 字幕 | 归档 + 最终检查清单 |

---

## 前置条件

### 1. 从 Role C 获取的交付物

Role C 应该提供：

```bash
# 文件清单
docs/for_judge.md                  # 4 行赛道要求全填
docs/EVIDENCE_INDEX.md             # 证据汇总
docs/guides/TESTING_GUIDE.md       # 测试步骤
docs/guides/ROLE_A_GUIDE.md        # 多签部署
src/lib/kite-aa.ts                 # 代码实现
src/demo-pay.ts                    # 演示脚本

# 演示资料
docs/videos/demo-3min.mp4          # 演示视频（或链接）
docs/screenshots/                  # 截图文件夹（多个 PNG）
```

### 2. 准备工具

```bash
# 必需
- PowerPoint / Google Slides / Keynote（制作 PPT）
- 视频编辑软件（Premiere / DaVinci Resolve / iMovie）
- 文本编辑器（Markdown）

# 可选
- Figma 或 draw.io（制作架构图）
- 配音工具（Audacity 或系统自带）
- 字幕工具（Subtitle Edit）
```

### 3. 时间规划

```
Phase 14: 2026-02-02 ~ 2026-02-04
├── 2026-02-02（2 小时）：PPT 初稿（10-12 页）
├── 2026-02-03（3 小时）：视频剪辑（1-3 分钟 + 高能版）
└── 2026-02-04（2 小时）：讲稿 + 最终检查

Total: ~7 小时工作量
```

---

## Step 1：制作 PPT（2 小时）

### PPT 结构（12 页）

```
Page 1:  封面（项目名 + 团队 + 日期）
Page 2:  目录（概览）
Page 3:  背景（赛道问题描述）
Page 4:  背景（为什么重要）
Page 5:  解决方案（架构图）
Page 6:  解决方案（链上支付）
Page 7:  解决方案（权限控制 + 多签）
Page 8:  MVP 演示（截图：干运行）
Page 9:  MVP 演示（截图：拒绝演示）
Page 10: 赛道对照（for_judge.md 4 行表格）
Page 11: 证据链（Tx Hash + 浏览器链接）
Page 12: 路线图（下一步）
```

### 逐页制作指南

#### Page 1: 封面
```
【大标题】
AgentPayGuard
Kite Payment Track MVP

【副标题】
链上支付 × 多签权限 × Agent 身份

【底部】
Team: Role A, B, C, D
Date: 2026-01-30
Kite Testnet
```

**设计建议**：
- 背景：简洁（白色或浅蓝）
- 字体：标题加粗（28pt+），副标题普通（18pt）
- 配色：与 Kite 品牌一致（查官方设计规范）

#### Page 2: 目录
```
【目录】

1. 背景与问题
2. 解决方案
3. 技术架构
4. MVP 演示
5. 赛道对照
6. 证据与链接
7. 下一步与路线图
```

#### Page 3-4: 背景

**Page 3: 问题**
```
【当前状态】
- 区块链交易成本高，用户体验差
- 企业级支付缺乏权限管理和风控
- Agent 身份难以与链上操作结合

【机会点】
- Kite 提供低成本、高速交易
- ERC-4337 标准化 Agent 账户
- 多签钱包可实现企业级权限
```

**Page 4: 为什么重要**
```
【市场需求】
✓ 稳定币支付日益普及
✓ DeFi 企业客户增多
✓ 安全和合规是必需

【竞争优势】
✓ 用 Kite 链实现最低成本
✓ 开源实现便于集成
✓ 完整的风控框架示例
```

#### Page 5: 架构图（含图示）
```
【系统架构】

[User / Agent]
        ↓
   [Policy Engine]
   ✓ Whitelist
   ✓ Limit
   ✓ Expiry
        ↓
   [Payment Path]
   ├─→ EOA Direct (fast)
   └─→ AA UserOp (flexible)
        ↓
   [Multisig Guard]
   ✓ Freeze / Unfreeze
   ✓ Permission Control
        ↓
   [Kite Chain]
   Testnet: 0x0fF539... (USDC)
```

**制作建议**：
- 使用 draw.io（免费）或 Figma（需付费）
- 下载为 PNG，插入 PPT
- 添加颜色代码，增强视觉效果

#### Page 6: 解决方案 - 链上支付
```
【链上支付实现】

技术栈：
- 链：Kite Testnet
- 代币：USDC（0x0fF539...）
- 方案 A：直接转账（EOA）
  → 简单、快速、低成本
- 方案 B：AA UserOp（ERC-4337）
  → 灵活、可扩展、企业友好

代码：src/lib/kite-aa.ts (104 行)
执行：pnpm demo:pay
结果：✅ 干运行通过，链上执行成功

证据：Tx Hash: 0xB_EOA... / 0xB_AA...
```

#### Page 7: 解决方案 - 权限控制
```
【权限控制 + 多签冻结】

架构：
1. 多签钱包（Gnosis Safe 2/3）
   → 需要 2 个成员签名

2. TokenGuard 冻结合约
   → frozen[account] = true
   → 暂停账户的转账

3. 风控拒绝
   → NOT_IN_ALLOWLIST
   → NOT_WITHIN_LIMIT
   → EXPIRED

证据：
- 多签地址：0xA...
- 冻结 Tx：0xA_FREEZE...
- 拒绝演示：✅ pnpm demo:reject
```

#### Page 8: MVP 演示 - 干运行
```
【干运行演示（Dry Run）】

命令：pnpm demo:pay

输出：
[CONFIG_LOADED] ✓ Environment variables validated
[POLICY_VALIDATION] ✓ Recipient in allowlist
[POLICY_VALIDATION] ✓ Amount <= limit 1000
[DRY_RUN] Would transfer 100 to 0x...
[DEMO_RESULT] ✓ Demo completed successfully

说明：
✓ 无链上交易（安全）
✓ 策略验证通过
✓ 逻辑完整可靠
```

**插入要素**：
- 截图：pnpm demo:pay 的完整输出
- 高亮：[POLICY_VALIDATION] ✓ 这一行

#### Page 9: MVP 演示 - 拒绝演示
```
【拒绝演示（非白名单收款）】

命令：pnpm demo:reject

输出：
[CONFIG_LOADED] ✓ Environment variables validated
[POLICY_TEST] Testing rejection scenario...
[POLICY_VALIDATION] ✗ Recipient 0xBADBADBAD... NOT in allowlist
[EXPECTED_REJECT] NOT_IN_ALLOWLIST
[DEMO_RESULT] ✓ Demo completed (rejection verified)

说明：
✓ 白名单强制
✓ 非授权地址被拦截
✓ 风控生效
```

**插入要素**：
- 截图：pnpm demo:reject 输出
- 高亮：[EXPECTED_REJECT] NOT_IN_ALLOWLIST

#### Page 10: 赛道对照表
```
【赛道要求对照】

| # | 要求 | 实现 | 证据 |
|---|------|------|------|
| 1 | 链上支付 | ERC-20 转账 | [Tx 0xB...](链接) |
| 2 | Agent身份 | ERC-4337 AA | [Tx 0xB...](链接) |
| 3 | 权限控制 | 多签冻结 | [Tx 0xA...](链接) |
| 4 | 可复现性 | 源代码 + Demo | [src/](链接) |

状态：✅ 全部达成
```

**插入要素**：
- 表格（用 PowerPoint 的表格工具）
- 可点击链接（右键设置链接）

#### Page 11: 证据链接
```
【完整证据链】

支付证据：
✓ EOA Tx: 0xB_EOA... (Kite 浏览器可查)
✓ AA Tx: 0xB_AA... (Bundler + Settlement)

权限证据：
✓ Multisig: 0xA... (成员: 0x..., 0x..., 0x...)
✓ Freeze Tx: 0xA... (冻结状态: true)

代码证据：
✓ src/lib/kite-aa.ts (104 行完整实现)
✓ src/lib/policy.ts (白名单 + 限额 + 有效期)
✓ pnpm typecheck: 0 errors

所有 Tx 都可在 Kite 浏览器（testnet.kite.ai）中验证
```

**插入要素**：
- Kite 浏览器截图（Tx 页面）
- 代码片段截图（关键函数）

#### Page 12: 路线图
```
【下一步与路线图】

Phase 1 (已完成):
✓ MVP 架构设计
✓ 基础支付 + 策略
✓ 多签风控框架

Phase 2 (后续):
□ 集成更多 Token (USDT, USDC)
□ 支持更复杂的策略 (时间窗口、速率限制)
□ Web UI 和 API

Phase 3 (长期):
□ 与 Kite 官方整合
□ 支持其他区块链 (Polygon, Arbitrum)
□ 企业级 SLA 和审计
```

### PPT 制作工具选择

| 工具 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| PowerPoint | 功能完整，易用 | 需付费 | ⭐⭐⭐⭐⭐ |
| Google Slides | 免费，协作好 | 功能相对简单 | ⭐⭐⭐⭐ |
| Keynote | 美观，易上手 | macOS 专用 | ⭐⭐⭐⭐ |

---

## Step 2：视频剪辑（3 小时）

### 视频版本

#### 版本 A：完整演示（1-3 分钟）

**结构**：
```
[00:00-00:30] 开场白
  "大家好，我是 Role D，为大家演示 AgentPayGuard MVP。
   这是一个在 Kite 链上实现的支付 + 权限控制系统。"

[00:30-01:00] 代码讲解
  ↓ 打开 src/lib/kite-aa.ts
  ↓ 指向 sendErc20ViaAA 函数
  "核心逻辑是这个 104 行的函数，实现了 ERC-4337 UserOperation 流程。"

[01:00-01:30] 干运行演示
  ↓ 运行：pnpm demo:pay
  ↓ 显示输出
  "这是干运行模式，策略验证通过，但不发链上交易。很安全。"

[01:30-02:00] 拒绝演示
  ↓ 运行：pnpm demo:reject
  ↓ 显示 NOT_IN_ALLOWLIST
  "这是拒绝演示，非白名单地址被拦截。权限控制生效。"

[02:00-02:30] 链上验证
  ↓ 打开 Kite 浏览器
  ↓ 查询 Tx Hash
  ↓ 显示成功状态
  "这是链上的真实交易，你可以在浏览器中验证。"

[02:30-03:00] 多签展示
  ↓ 显示多签钱包
  ↓ 显示冻结交易
  "这是多签钱包和冻结交易，展示了权限管理的能力。"

[03:00-03:15] 总结
  ↓ 回到 for_judge.md
  "4 个赛道要求全部达成。谢谢大家。"
```

#### 版本 B：高能版（10-30 秒）

```
[00:00-00:05] 快速概览
  ↓ 展示架构图
  "AgentPayGuard：链上支付 + 权限控制"

[00:05-00:15] Demo
  ↓ 快速切换：代码 → 干运行 → 拒绝 → 链上验证
  "支持 EOA 直接转账和 AA UserOp 两种路径"

[00:15-00:25] 证据
  ↓ 显示 4 个 Tx Hash
  ↓ 显示多签钱包
  "所有功能在 Kite 测试网已验证"

[00:25-00:30] 结语
  ↓ for_judge.md 4 行表格
  "赛道要求全部达成。"
```

### 视频编辑步骤

#### 1) 收集素材

```bash
# 从 Role C 收集
- demo_video.mp4（原始录屏）
- screenshot_code.png（代码截图）
- screenshot_dry_run.png（干运行截图）
- screenshot_reject.png（拒绝演示截图）
- screenshot_tx.png（链上 Tx 截图）
- screenshot_multisig.png（多签截图）
```

#### 2) 导入编辑软件

使用 DaVinci Resolve（免费）：

```bash
# 创建新项目
File → New Project

# 导入素材
Media Pool → 拖入所有 mp4 和 png

# 创建时间轴
Timeline → Drag and drop素材

# 调整顺序和时长
- 视频剪辑（删除卡顿部分）
- 截图按顺序排列，每张停留 2-3 秒
```

#### 3) 添加字幕

```bash
# 在 DaVinci Resolve 中
Effects → Subtitle → 添加字幕
或
File → Export → Add subtitle track

# 字幕内容（参考完整演示脚本）
[00:30] "这是代码实现..."
[01:00] "这是干运行演示..."
```

#### 4) 添加配音（可选）

```bash
# 如果原视频没有声音或质量差，录制新配音
- macOS: QuickTime 或 Audacity
- Windows: Audacity 或 Adobe Audition
- 配音后导入编辑软件

# 混音
- 背景音乐（可选，建议静默或轻背景音）
- 配音音量：-3dB（不要过大）
- 导出：立体声，44.1 kHz
```

#### 5) 导出

```bash
# 设置
- 分辨率：1920x1080 或 1280x720
- 帧率：30 fps
- 码率：6-8 Mbps（质量和文件大小平衡）
- 格式：MP4（H.264）
- 音频：AAC, 128 kbps

# 导出
File → Export → 选择格式 → Export

# 文件大小目标
- 3 分钟视频：30-80 MB（便于分享）
```

---

## Step 3：准备讲稿与现场演示（2 小时）

### 讲稿结构

创建文件 `docs/PITCH_SCRIPT.md`：

```markdown
# 演讲稿与时间轴

## 完整讲稿（3-5 分钟）

### 开场（第 0-30 秒）
【内容】
"大家好，我是 AgentPayGuard 项目的 Role D。
我们为 Kite Payment Track 设计了一个 MVP，
展示在 Kite 链上实现高效、安全的企业级支付系统。
这个系统有三个核心特点：链上支付、Agent 身份和权限控制。
接下来我将为大家进行完整的演示。"

【画面】幻灯片第 1 页（封面）
【时间】✓ 自然停顿，给评委反应时间

### 背景介绍（第 30-60 秒）
【内容】
"首先介绍一下背景。
当前区块链支付存在三个问题：
第一，交易成本高。
第二，缺乏企业级的权限和风控。
第三，Agent 身份与链上操作难以结合。

Kite 链为我们解决这些问题提供了机会。"

【画面】幻灯片第 3-4 页（背景）
【时间】✓ 每个要点停顿 3 秒

### 架构讲解（第 60-90 秒）
【内容】
"我们的解决方案包括三层：
第一层是策略引擎，包括白名单、限额和有效期校验。
第二层是支付路径，支持 EOA 直接转账和 AA UserOp 两种方式。
第三层是多签风控，可以冻结高风险账户。

整个系统在 Kite 测试网上实现，使用 USDC 稳定币。"

【画面】幻灯片第 5 页（架构图）
【时间】✓ 指向图中的每个部分，停顿 5 秒

### 代码展示（第 90-120 秒）
【内容】
"让我们看一下核心代码。
这是 src/lib/kite-aa.ts 文件，104 行代码实现了完整的 ERC-4337 流程。
主函数是 sendErc20ViaAA，做了 8 个步骤：
一，初始化 SDK。
二，获取账户地址。
三，派生 AA 账户。
四，编码转账指令。
五，签名。
六，发送 UserOperation 到 Bundler。
七，轮询状态。
八，返回结果。

代码经过 TypeScript 类型检查，0 个错误。"

【画面】幻灯片第 6 页 或 代码截图
【时间】✓ 逐个讲解每个步骤，每步 3 秒

### 干运行演示（第 120-150 秒）
【内容】
"现在我们来运行演示。
这是干运行模式，不会发送真实的链上交易，很安全。
命令是：pnpm demo:pay

看输出：
第一行，环境变量加载成功。
第二行，策略验证通过。
第三行，显示"Would transfer"，说明是干运行。
最后一行，demo 完成。

这表示我们的代码逻辑完全正确。"

【画面】幻灯片第 8 页 或 实时运行
【时间】✓ 等待命令执行（5-10 秒），然后讲解输出

### 拒绝演示（第 150-180 秒）
【内容】
"接下来是拒绝演示。
我们故意使用一个不在白名单中的收款地址。

命令是：pnpm demo:reject

看输出，最关键的一行：
'VALIDATION ✗ NOT_IN_ALLOWLIST'

这说明白名单规则生效了。
权限控制正常工作。"

【画面】幻灯片第 9 页 或 实时运行
【时间】✓ 强调 NOT_IN_ALLOWLIST 这一行，停顿 3 秒

### 链上验证（第 180-240 秒）
【内容】
"现在让我们看链上的真实交易。
这是 Kite 浏览器，网址是 testnet.kite.ai。

我打开第一个交易：0xB_EOA...
可以看到：
- Status：Success（交易成功）
- From：我的钱包地址
- To：收款方地址
- Value：100 USDC

这是 EOA 直接转账的结果。

再看第二个交易：0xB_AA...
这是通过 AA 的 UserOperation 执行的。
发送方是 AA Account，不是 EOA。
这展示了 Agent 身份的实现。

最后，这是冻结交易：0xA...
由多签钱包（2/3 阈值）执行。
冻结了一个高风险账户。
多签成员有 3 个人，需要 2 个签名。"

【画面】幻灯片第 11 页 或 实时打开浏览器
【时间】✓ 每个 Tx 展示 15-20 秒，点击交互

### 赛道要求对照（第 240-270 秒）
【内容】
"让我们看 for_judge.md，这是评委的评审标准。
我们有 4 行要求，我逐个对照：

第 1 行，链上支付。
✓ 我们在 Kite 链上实现了 USDC 转账。
✓ Tx Hash 是 0xB_EOA...

第 2 行，Agent 身份。
✓ 我们使用 ERC-4337 和 gokite-aa-sdk 实现了 AA。
✓ Tx Hash 是 0xB_AA...

第 3 行，权限控制。
✓ 我们部署了 Gnosis Safe 多签钱包。
✓ 我们实现了 TokenGuard 冻结合约。
✓ 展示了拒绝演示（NOT_IN_ALLOWLIST）。
✓ Tx Hash 是 0xA_FREEZE...

第 4 行，可复现性。
✓ 代码开源，104 行完整实现。
✓ 脚本一键运行。
✓ 干运行和链上都验证通过。

所以，4 个赛道要求我们全部达成。"

【画面】幻灯片第 10 页（对照表）
【时间】✓ 每行 5-8 秒，强调 ✓ 符号

### 总结与展望（第 270-300 秒）
【内容】
"总结一下：

我们为 Kite Payment Track 设计并实现了一个完整的 MVP。
它涵盖了链上支付、Agent 身份和权限控制三个核心功能。
所有代码都是开源的，所有交易都在测试网上验证过。
所有功能都可以一键复现。

接下来的计划是：
一，集成更多的 Token。
二，支持更复杂的策略（时间窗口、速率限制等）。
三，开发 Web UI 和 API。

感谢大家的关注。现在我们可以回答问题。"

【画面】幻灯片第 12 页（路线图）
【时间】✓ 自然结束，给 Q&A 留出时间

---

## 时间轴详表

| 时间 | 讲稿要点 | 幻灯片 | 画面切换 | 备注 |
|------|---------|--------|---------|------|
| 0:00 | 开场 | 1 | - | 自然停顿 |
| 0:30 | 背景 | 3-4 | 逐页下翻 | 每点 3 秒 |
| 1:00 | 架构 | 5 | 指向图 | 暂停 5 秒 |
| 1:30 | 代码 | 6 | 截图或代码编辑器 | 每行讲解 |
| 2:00 | 干运行 | 8 | 终端窗口 | 实时运行 |
| 2:30 | 拒绝 | 9 | 终端窗口 | 强调关键行 |
| 3:00 | 链上 | 11 | 浏览器 | 切换 3 个 Tx |
| 4:00 | 对照 | 10 | 表格 | 逐行对应 |
| 4:30 | 总结 | 12 | - | 自然收尾 |

## Q&A 预案

**Q1: 为什么选择 Kite？**
A: Kite 提供低成本、高速的区块链基础设施。对于支付场景，这是最重要的。

**Q2: 如何处理网络故障或 Bundler 不可用？**
A: 我们支持 EOA 直接转账作为备选路径。代码中有超时处理和重试逻辑。

**Q3: 多签钱包的扩展性如何？**
A: Gnosis Safe 支持任意多个成员和自定义阈值。我们演示的 2/3 是一个例子，可以变成 3/5、5/9 等。

**Q4: 代码的安全性如何？**
A: 代码经过 TypeScript 类型检查，使用了 ethers.js 和官方的 gokite-aa-sdk，这些都是经过验证的库。

**Q5: 如何与 Kite 官方集成？**
A: 代码遵循 ERC-4337 标准和 Kite SDK 的最佳实践，便于官方集成和未来维护。

---

## 现场演示检查清单

【30 分钟前】
- [ ] 笔记本电源充足
- [ ] 网络连接正常（提前测试 Kite 浏览器访问）
- [ ] 演示视频已缓存本地（防止网络卡顿）
- [ ] PPT 已打开，从第 1 页开始
- [ ] 终端已准备，代码目录已打开

【演示中】
- [ ] 语速控制（每分钟 130-150 字）
- [ ] 眼神接触（看评委，不只看屏幕）
- [ ] 指向明确（用鼠标指向关键信息）
- [ ] 暂停适当（给评委反应和记笔记的时间）
- [ ] 手机静音（防止中断）

【备选方案】
- [ ] 如果网络卡顿，切到离线演示视频
- [ ] 如果代码运行失败，展示预录的截图
- [ ] 如果评委提问，有 Q&A 预案卡
```

---

## Step 4：最终检查与归档

### 最终检查清单

```bash
【PPT 检查】
- [ ] 12 页全部完成，无空白页
- [ ] 所有链接可点击（右键检查）
- [ ] 所有截图清晰（分辨率 >= 150 DPI）
- [ ] 所有表格格式整齐
- [ ] 字体一致（标题、正文、代码）
- [ ] 拼写和语法检查
- [ ] 在投影仪上测试显示效果
- [ ] 导出为 PDF（备选格式）

【视频检查】
- [ ] 1-3 分钟版本已完成
- [ ] 10-30 秒高能版已完成
- [ ] 音频清晰，无爆音
- [ ] 字幕同步
- [ ] 文件大小 < 200 MB
- [ ] 在多台设备上测试播放

【讲稿检查】
- [ ] 时间轴精确到秒
- [ ] 每个时间点的画面标注清楚
- [ ] Q&A 预案已准备
- [ ] 备选方案已列出
- [ ] 现场演示检查清单完成

【归档】
- [ ] 所有文件放在 docs/ 下
- [ ] 创建 docs/DELIVERABLES.md（最终交付清单）
- [ ] git add && git commit && git push
```

### 最终交付清单

创建文件 `docs/DELIVERABLES.md`：

```markdown
# 最终交付清单（Role D）

## Phase 14 完成项目

### 1. PPT 演讲稿
- 文件：pitch_deck.pdf 或 pitch_deck.pptx
- 页数：12 页
- 内容：背景 → 架构 → 代码 → Demo → 对照 → 证据 → 路线图
- 验证：✓ 无空白页，所有链接可用，投影仪显示正常

### 2. 演示视频
- 完整版：demo_3min.mp4（1-3 分钟，~50 MB）
- 高能版：demo_30sec.mp4（10-30 秒，~10 MB）
- 质量：1280x720 或更高，30 fps，H.264 编码
- 内容：代码 → 干运行 → 拒绝 → 链上验证 → 总结
- 验证：✓ 音频清晰，字幕同步，文件播放正常

### 3. 现场讲稿
- 文件：PITCH_SCRIPT.md（Markdown 格式）
- 长度：3-5 分钟（约 1500 字）
- 内容：分钟级时间轴，每个画面切换标注
- 备注：包含 Q&A 预案、备选方案、现场检查清单
- 验证：✓ 讲稿与 PPT 对应，时间轴准确

### 4. 文件归档
```
docs/
├── pitch_deck.pdf              # 最终 PPT（导出版）
├── pitch_deck.pptx             # 原始文件（可编辑）
├── PITCH_SCRIPT.md             # 现场讲稿
├── videos/
│   ├── demo_3min.mp4           # 完整演示视频
│   └── demo_30sec.mp4          # 高能快速版
├── screenshots/
│   ├── code.png
│   ├── dry_run.png
│   ├── reject.png
│   ├── tx_eoa.png
│   ├── tx_aa.png
│   └── multisig.png
└── DELIVERABLES.md             # 此文件

```

### 5. 验收标准

| 项目 | 标准 | 状态 |
|------|------|------|
| PPT | 12 页完整，无空白，所有链接可用 | ✓ |
| 视频 | 1-3 分钟 + 30 秒版本，音视频同步 | ✓ |
| 讲稿 | 时间轴精确到秒，Q&A 预案完整 | ✓ |
| 技术 | 所有内容与 for_judge.md 对应 | ✓ |
| 归档 | 所有文件 Git 提交，可追溯 | ✓ |

---

## 项目总体完成度

✅ **100% 完成**

- Phase 1-3：代码实现（104 行 + 政策规则）
- Phase 4-6：文档和指南
- Phase 7-12：指南补充和分类
- Phase 13：交付清单和约束
- Phase 14：最终演示素材和讲稿

所有 4 个赛道要求已实现和验证。
所有团队角色（A/B/C/D）的工作已定义和追踪。
所有交付物已准备就绪，可用于评审和演示。

---

## 下一步

1. 【评审前】进行最后的综合测试（整体 pnpm demo）
2. 【演示前】现场彩排一遍讲稿和视频
3. 【演示中】按时间轴执行，做好时间管理
4. 【演示后】收集评委反馈，记录改进点

---

**交付清单版本**：1.0  
**完成日期**：2026-02-04  
**项目状态**：🟢 **准备就绪，可演示**
```

---

## 工具推荐和资源

### 软件工具

| 任务 | 工具 | 成本 | 推荐度 |
|------|------|------|--------|
| PPT 制作 | PowerPoint / Google Slides | 收费 / 免费 | ⭐⭐⭐⭐⭐ |
| 视频编辑 | DaVinci Resolve | 免费 | ⭐⭐⭐⭐⭐ |
| 架构图 | draw.io / Figma | 免费 / 付费 | ⭐⭐⭐⭐ |
| 配音 | Audacity | 免费 | ⭐⭐⭐⭐ |
| 录屏 | OBS Studio | 免费 | ⭐⭐⭐⭐⭐ |

### 在线资源

- [DaVinci Resolve 教程](https://www.blackmagicdesign.com/products/davinciresolve/)
- [PowerPoint 设计技巧](https://design.office.com/)
- [演讲技巧](https://www.toastmasters.org/)（可选进阶）

---

**指南版本**：1.0  
**最后更新**：2026-01-30  
**作者**：AI Assistant (Copilot)
