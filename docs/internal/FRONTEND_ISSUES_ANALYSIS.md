## 前端设计问题分析（功能 + 美观）

---

## 功能问题

### 1. 大量页面使用硬编码 Mock 数据，无真实链上交互

- **Dashboard**、**Freeze**、**Proposals**、**History** 四个页面全部使用 `MOCK_DATA`（`config.ts:58-111`），数据写死在代码里
- Freeze 页面的"搜索"只是在本地 mock 数组中做 `includes` 比较（`Freeze.tsx:30`），"冻结/解冻"按钮只是 `setTimeout` 模拟延迟（`Freeze.tsx:38-42`），没有任何链上调用
- Proposals 页面的"Create Proposal"、"Confirm"、"Execute"按钮均无实际逻辑
- History 页面的"Load More"按钮没有绑定任何事件

**后端已经有完整的策略引擎和合约交互，但前端 Dashboard/Freeze/Proposals/History 完全没接入。**

> **[已修复 - Phase 31]** Freeze/Proposals/Dashboard 已接入真实合约调用（`feature/real-contract-calls` 分支）。History 页面仍为 mock。

### 2. Pay 页面没有使用 i18n

- `Pay.tsx` 中大量硬编码中文："发起支付"、"收款地址"、"金额"、"支付模式"、"真实发链上交易"
- 而 `AIPay.tsx` 和 `Index.tsx` 都使用了 `useLanguage()` + `t()` 做中英双语
- 语言切换按钮只在首页有（`LanguageToggle` 只出现在 `Index.tsx`），子页面切换语言后进入 Pay 页还是中文

### 3. 钱包连接形同虚设

- Pay 和 AIPay 页面的支付逻辑走的是后端 API（使用 `.env` 中的私钥），钱包连接只用来显示网络状态
- 用户连接钱包后会期望用自己的钱包签名交易，但实际不是——这个认知落差会造成困惑
- Dashboard 要求钱包连接才能进入，但进去后展示的全是 mock 数据，连接了也没用

> **[已部分修复 - Phase 31]** Dashboard/Freeze/Proposals 现在通过 wagmi hooks 使用钱包签名真实链上交易。Pay/AIPay 仍走后端 API。

### 4. 无表单校验

- Pay 页面的收款地址输入框无以太坊地址格式校验
- AIPay 的 textarea 无长度限制
- Proposals 的"Create Proposal"对话框中 target address 也无格式校验

> **[已部分修复 - Phase 31]** Freeze 和 Proposals 页面的地址输入已添加 `0x[a-fA-F0-9]{40}` 正则校验。

### 5. 前后端页面能力不对称

- 后端有 `/api/policy` 接口（返回白名单、限额等），但前端没有任何页面展示当前策略配置
- 后端有每日消费追踪（`state.ts`），前端无处展示
- 合约有 `SimpleMultiSig`（提交/确认/执行提案），前端 Proposals 页面只是 UI 壳子

> **[已部分修复 - Phase 31]** Proposals 页面现在支持真实的提交/确认/执行操作。策略展示和日消费追踪仍未实现。

---

## 美观 / UX 问题

### 1. 风格一致性问题

- Header 样式不统一：Index 用 `fixed`，Dashboard/Freeze/AIPay 用 `sticky`，History 的 header padding 不同（`py-4` vs 其他页面的 `py-3`），hex-clip 图标大小也不一致（History 用 `w-10 h-10`，其他用 `w-8 h-8`）
- 返回按钮指向不一致：Pay/AIPay 返回首页 `/`，Dashboard 也返回 `/`，但 Freeze/Proposals/History 返回 `/dashboard`

### 2. ParticleBackground 性能开销

- 每个页面都渲染了 `<ParticleBackground />`，页面切换时反复创建销毁。这个组件涉及 canvas 粒子动画，在低端设备上可能造成性能问题
- 首页还额外有 `<HolographicShield />`（一个复杂的 SVG 动画组件），叠加粒子背景

### 3. 移动端体验薄弱

- 首页的核心视觉元素 `HolographicShield` 在移动端直接隐藏（`hidden lg:flex`），替代品只是一个小图标
- Dashboard 右侧列地址+余额在移动端隐藏（`hidden md:flex`）
- History 页面的 timeline 布局在窄屏上竖线和卡片的间距可能拥挤

### 4. 深色主题唯一，缺少对比度选择

- 只有赛博朋克暗色终端主题，没有亮色模式
- 对于支付/金融场景，纯暗色主题加大量动画可能给用户"不够严肃"的感觉

### 5. 信息层次不够清晰

- AIPay 结果展示是四个紧密堆叠的 panel（Intent → Risk → Policy → Tx），视觉权重相同，用户难以快速判断"通过了没有"
- Dashboard 的 Quick Status 和 Quick Actions 内容重复（冻结数量在左右两列都出现），信息密度低

---

## 改进优先级

1. ~~**让 Freeze/Proposals 页面接入真实合约调用**（项目核心卖点——多签风控）~~ **[Done - Phase 31]**
2. ~~**Pay 页面补全 i18n，语言切换组件放到公共 header**~~ **[Done]** Pay 使用 `t()`，Layout 含 LanguageToggle。
3. ~~**抽取公共 Layout 组件**（统一 header/背景/返回按钮逻辑）~~ **[Done]** `components/Layout.tsx`，Pay/AIPay/Dashboard/Freeze/Proposals/History 已接入。
4. ~~**新增策略展示页面或在 Dashboard 展示当前 policy 配置**~~ **[Done]** Dashboard 右侧「Policy (API)」卡片，请求 `/api/policy`。
5. ~~**History 页面接入真实链上数据**~~ **[Done]** History 使用 `useProposals()` 多签链上数据。
