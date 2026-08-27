# 订单详情操作按钮：现状与结论

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-17  
> 性质：**结论文档**（产品口径已拍板；本文不写实现步骤，按本文执行时再改代码）  
> 范围：居民端 [`apps/miniapp-customer/src/pages/order-detail/index.vue`](../apps/miniapp-customer/src/pages/order-detail/index.vue)、员工端 [`apps/miniapp-worker/src/pages/task-detail/index.vue`](../apps/miniapp-worker/src/pages/task-detail/index.vue) 的**底部操作栏**  
> 不含：列表页按钮、家政咨询详情改造、真地图导航（`uni.openLocation`）、后端状态机变更

关联：

| 主题 | 文档 |
|------|------|
| 列表角标 / 筛选文案 | [`order-status-labels-consolidate.md`](./order-status-labels-consolidate.md) |
| 详情服务进度时间轴 | [`order-service-progress.md`](./order-service-progress.md) |
| GPS 签到与地址坐标 | [`gps-checkin-address-distance.md`](./gps-checkin-address-distance.md) |

---

## 已拍板口径

1. **联系客服从 `ASSIGNED` 起常驻**，不是替换其他按钮。后续状态在客服旁边**叠加**当时该做的操作。
2. **待评价时「评价服务」是唯一实心主按钮**；联系客服、投诉反馈（若显示）一律次按钮。两条不冲突：一条管从哪一状态出现客服，一条管待评价时谁最醒目。
3. **一单一投，前端限制**：详情已拉到投诉记录则底部不出现「投诉反馈」，看进度只走中间投诉卡片。不改后端（后端仍允许多投，入口没有即可）。
4. **员工端不在底部加「联系客户」**：订单信息里已有联系人 / 被服务人拨号。
5. **导航先维持现状**：地址旁复制地址，不接微信 `openLocation`。有坐标后再另议。
6. **家政咨询、已取消**：本次不改。员工端底部主流程按钮本次不改。

---

## 居民端（保洁 / 废品）

### 叠按钮顺序（从左到右）

1. 投诉反馈（有投诉记录则整项不渲染）
2. 联系客服（`ASSIGNED` 起常驻，次按钮）
3. 评价服务（仅 `PENDING_REVIEW` 且 7 天内，唯一主按钮）

`PENDING_ASSIGN` 只有取消，不叠客服。`CANCELLED` 底部保持空。

### 现状 vs 结论

| 状态 | 现状底部 | 结论底部 |
|------|----------|----------|
| `PENDING_ASSIGN` | 取消订单 | **取消订单**（不变） |
| `ASSIGNED` | 无 | **联系客服** |
| `ACCEPTED` | 投诉反馈 + 联系客服 | 无投诉：**投诉反馈** + **联系客服**；有投诉：只留 **联系客服** |
| `IN_SERVICE` | 同上 | 同上 |
| `PENDING_REVIEW`（7 天内） | 投诉 + 客服 + 评价（两个主按钮） | 无投诉：投诉（次）+ 客服（次）+ **评价服务（主）**；有投诉：客服（次）+ **评价服务（主）** |
| `PENDING_REVIEW`（超 7 天） | 投诉 + 客服 | 无投诉：投诉 + 客服；有投诉：只留客服（评价仍不显示） |
| `REVIEWED` | 投诉 + 客服 | 同 `ACCEPTED`：有投诉则只留客服 |
| `CANCELLED` | 无 | 保持无 |

卡片内拨号（员工 / 联系人 / 被服务人）不动。中间投诉卡片「查看投诉进度」保留。

家政咨询（`FOLLOW_UP` / `FOLLOWING` / `COMPLETED`）现状全状态无底部按钮，**本次不改**。

---

## 员工端（保洁 / 废品）

底部仍是「一状态一个主操作」。电话与复制地址留在订单信息，不搬到底栏。

| 状态 | 现状底部 | 结论底部 |
|------|----------|----------|
| `ASSIGNED` | 立即接单 | 不变 |
| `ACCEPTED` | 开始服务 | 不变 |
| `IN_SERVICE` | 完成服务 | 不变 |
| `PENDING_REVIEW` / `REVIEWED` / `CANCELLED` | 无 | 不变 |

订单信息已有、保持即可：

- 顶部客户条 / 联系人电话 / 被服务人电话 → `uni.makePhoneCall`
- 服务地址旁图标 → 复制地址（导航先用这一形式）

---

## 明确不做（本文结论范围外）

- 不改状态机：取消仍仅 `PENDING_ASSIGN`；员工仍无拒绝 / 转单。
- 不接 `uni.openLocation`；无坐标时继续复制地址。
- 不在员工底栏加「联系客户」或「导航」。
- 不改家政咨询详情按钮。
- 评价 7 天窗口仍只在前端；不在本文做超时自动结单。
- 「模拟签到」环境开关不在本次按钮结论内，见签到方案文档。
