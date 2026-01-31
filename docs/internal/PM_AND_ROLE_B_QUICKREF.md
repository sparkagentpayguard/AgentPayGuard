# PM & 角色 B 快速参考

> **规整文档**：所有 PM / Role B 相关内容已整合至 [PM_AND_ROLE_B_CONSOLIDATED.md](PM_AND_ROLE_B_CONSOLIDATED.md)，按用途分类。本文档为精简入口。

---

## 项目管理者检查清单

- [ ] 新成员克隆后执行 `git submodule update --init --recursive`（README 已写）
- [ ] 前端 RPC/浏览器为 Kite 官方（`rpc-testnet.gokite.ai` / `testnet.kitescan.ai`）
- [ ] 前后端若有 API 需求，接口约定已写在 allocation 或单独文档
- [ ] 子模块仓库权限与发布节奏已明确

---

## 角色 B 检查清单

- [ ] EOA Tx Hash 已产出并交付 C
- [ ] AA Tx Hash 已产出并交付 C
- [ ] 环境变量与 TESTING_GUIDE / .env.example 一致
- [ ] 若启用冻结检查，`FREEZE_CONTRACT_ADDRESS` 与 A 交付一致
- [ ] AGENT_WORKLOG 已更新（完成 EOA/AA 后追加 Phase）

---

## 文档入口

| 用途 | 文档 |
|------|------|
| **PM & Role B 规整文档**（检查清单、测试、A→B 交付、索引） | [PM_AND_ROLE_B_CONSOLIDATED.md](PM_AND_ROLE_B_CONSOLIDATED.md) |
| Role B 详细测试步骤（5 场景 + 演讲） | [TESTING_GUIDE.md](../guides/TESTING_GUIDE.md) |
| A→B 合约交付（多签/冻结合约、ABI、集成方案） | [交付给角色B.md](../multisig/交付给角色B.md) |
| 总交付清单（A/B/C/D） | [FINAL_DELIVERY_CHECKLIST.md](FINAL_DELIVERY_CHECKLIST.md) |
| 角色分工与交接表 | [allocation.md](../reference/allocation.md) |
