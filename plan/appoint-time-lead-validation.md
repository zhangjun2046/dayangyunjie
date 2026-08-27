# 预约时间过期与派单缓冲校验

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-19  
> 性质：**结论文档**（产品口径已拍板；本文不写实现补丁，按本文执行时再改代码）  
> 范围：居民端保洁 / 废品预约「下一步 + 提交」校验；后端保洁 / 废品 **创建订单** 兜底  
> 不含：时段置灰、员工空闲库存、家政咨询、改期 `update`、管理端 UI、业务字典

关联：居民端预约页 [`booking-cleaning/index.vue`](../apps/miniapp-customer/src/pages/booking-cleaning/index.vue)、[`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue)；创建接口 [`cleaning-order.service.ts`](../apps/server/src/modules/cleaning-order/cleaning-order.service.ts)、[`recycling-order.service.ts`](../apps/server/src/modules/recycling-order/recycling-order.service.ts)

---

## 已拍板口径

1. **拼完整时刻再比**：把 `appointDate`（`YYYY-MM-DD`）和 `appointTimeSlot` 的起始 `HH:mm` 拼成东八区完整时刻 `YYYY-MM-DDTHH:mm:00+08:00`，再和「当前时间 + 60 分钟」比较。不单独比日期，也不只比 `08:00` 字符串。
2. **拒绝条件**：`预约开始时刻 <= 当前时刻 + 60 分钟` → 不可进入确认页、不可提交、后端返回 400。相等也拒（含刚好卡在缓冲边界）。
3. **缓冲 60 分钟**：给人工派单和上门留空。用户选的仍是上门时间，提交字段仍是原 `appointDate` / `appointTimeSlot`，不要把 `11:00` 改成别的值再传。
4. **前端不置灰**：8 个时段按钮保持全可点。校验放在第二步「下一步」和第三步「提交订单」。
5. **后端必须拦**：保洁、回收 `create` 用同一规则，防止改设备时间或直调接口。
6. **家政咨询**：无预约时段，不改。

### 判定公式

```text
appointAt = Date(appointDate + 时段起始 HH:mm，时区 +08:00)
tooSoon   = appointAt.getTime() <= Date.now() + 60 * 60 * 1000
```

`tooSoon === true` 则拒绝。

### 示例

现在是 8 月 19 日 10:05，缓冲 60 分钟，最早可约点为 11:05：

| 选择 | 拼出的时刻 | 结果 |
|------|------------|------|
| 当天 `08:00` | 08-19 08:00 | 拒绝 |
| 当天 `10:00` | 08-19 10:00 | 拒绝 |
| 当天 `11:00` | 08-19 11:00 | 拒绝（11:00 ≤ 11:05） |
| 当天 `14:00` | 08-19 14:00 | 通过 |
| 明天任意时段 | 次日 HH:mm | 通过 |

时段取起始：小程序传 `08:00`；若历史值是 `09:00-11:00`，取 `09:00`。

失败文案（前后端一致）：**请至少提前 1 小时预约**。

---

## 现状（实现时对照）

- 日历只把 **今天之前** 的日期标 `disabled`；当天始终可选。进入第二步若未选日期，默认今天。
- 时段常量：`['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']`，点击即写入 `store.selectedTime`，无「已过 / 过近」判断。
- 第二步「下一步」只检查是否已选日期、时段、地址。
- 提交原样传 `appointDate: store.selectedDate`、`appointTimeSlot: store.selectedTime`。
- 后端 `create` 只把 `appointDate` 交给 `parseDateString` 入库，不和当前时间比较。
- **时区坑**：`new Date('YYYY-MM-DD')` 按 UTC 零点解析，中国会偏 8 小时。比较时必须显式 `+08:00`，不能复用现有 `parseDateString` 去做「时刻是否过近」。

废品回收预约页与保洁同构。

---

## 实现时改哪里（按本文执行时再动代码）

### 居民端

抽 [`apps/miniapp-customer/src/utils/appoint-time.ts`](../apps/miniapp-customer/src/utils/appoint-time.ts)：

- 常量 `MIN_LEAD_MINUTES = 60`
- `isAppointTooSoon(dateStr, slot): boolean`

两页在已有「已选日期 / 已选时段」校验之后调用：

- [`booking-cleaning/index.vue`](../apps/miniapp-customer/src/pages/booking-cleaning/index.vue)：`nextStep`（step 2 → 3）和 `submitOrder`
- [`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue)：同上

失败 `uni.showToast({ title: '请至少提前 1 小时预约', icon: 'none' })`。不改时段按钮样式、不禁日历「今天」。

### 服务端

抽公共方法（建议 [`apps/server/src/common/appoint-time.ts`](../apps/server/src/common/appoint-time.ts)）：

- 常量同样 `MIN_LEAD_MINUTES = 60`（与前端数字必须一致；不要进业务字典）
- `assertAppointNotTooSoon(appointDate, appointTimeSlot)`：过近抛 `BadRequestException('请至少提前 1 小时预约')`

在两个 `create` 写库前调用：

- [`cleaning-order.service.ts`](../apps/server/src/modules/cleaning-order/cleaning-order.service.ts)
- [`recycling-order.service.ts`](../apps/server/src/modules/recycling-order/recycling-order.service.ts)

拼时刻用 ISO：`` `${datePart}T${hhmm}:00+08:00` ``，再和 `Date.now()` 比。

管理端代下单走同一 `create`，过近单也会被拒。本次 **不改** admin 时段按钮置灰；若以后要补历史单，再另开开关（例如仅拦 `source = MINIPROGRAM`）。

补 create 单测：已过、卡在 60 分钟边界、明天通过。

---

## 明确不做

- 不置灰已过 / 过近时段，不把「今天已无可用点」的日历格禁用。
- 不按员工空闲、排班、已派单冲突筛可约时段（那是运力库存，另开）。
- 不把缓冲分钟数写入业务字典；运营改数字只动前后端同一常量。
- 不改家政咨询下单。
- 不改改期 `update`（除非后续明确要同一规则）。
- 不把缓冲编码进提交值；订单上仍是用户选的上门时间。
