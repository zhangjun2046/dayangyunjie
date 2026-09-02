# 回收品项（废品回收分类下的具体内容）

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-09-01  
> 修订：2026-09-01 — 确认/详情物品用顿号拼名称；PC 代下单与详情、小程序管理端详情补齐；Step2 物品/电梯/大件楼层必选  
> 性质：**结论文档 + 分步手册**（产品口径已拍板；按本文执行时再改代码）  
> 范围：品项配置、订单快照、居民 Step2 选品与必选拦截、价格表页、确认/各端**详情**展示、PC 代下单  
> 不含：按报价算钱、**任何订单列表**展示物品/电梯/楼层、员工任务卡片改版、改 [`code-update-steps.md`](./code-update-steps.md)

关联：居民端 [`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue)；服务目录 [`ServiceCatalog`](../apps/server/prisma/schema.prisma)；废品单 [`RecyclingOrder`](../apps/server/prisma/schema.prisma)

---

## 给执行本文件的 AI（硬规则）

1. **产品口径以本文为准。** 与本文冲突时停下来问，不要自行发明规则。  
2. **一次只做一步。** 用户说「按 recycling-item 实现 / 做下一步」且未指定步号 → 从尚未完成的**最小一步**做起（A1 / A2 / A3 / B / C / D / E），做完汇报验收，**先 git commit 到本地**，等下一轮。  
3. **禁止跨步。** 做配置表时不要顺手改预约页；C 步不要改确认页 / 各端详情（那是 D）；D 步不要改 PC 代下单表单（那是 E）。  
4. 某步已验收 → 不要重做。A～E 都做完 → 停，回复：本文步骤均已落地。  
5. **禁止**把品项塞进 `ServiceCatalog`（不要 `parentId` / 价格字段）。大件/小件仍是服务目录；品项是专用表。  
6. **金额只存展示文案**，不解析、不计价、不乘重量 / 数量。不要用 `Decimal`。  
7. 现有 [`RecyclingItemType`](../packages/shared/src/constants/index.ts)（`LARGE` / `SMALL`）继续表示订单上的大件/小件，**不要改名、不要复用当新品项表**。  
8. 大件 / 小件 UI 判定沿用现网：`catalog.name.includes('大件')` / `includes('小件')`。不要给服务目录加新枚举。  
9. 订单只存品项**快照**，**不要**外键到 `recycling_items`。  
10. **禁止改 Step1**：大件/小件卡片、预估重量、大件搬运提示一律保留。选品只加在 Step2。  
11. 大件「价格表」必须 `uni.navigateTo` **独立页**，禁止弹层 / 半屏。  
12. 确认页与各端**详情**按 §2.7 展示；**任何列表都不加**物品 / 电梯 / 楼层。  
13. **每步做完、下一步开始前：本地 git commit。** 只 commit 本步改动；不要 `git push`；不要提交 `.env`、密钥。说明写步号 + 为什么，例如 `feat(recycling-item): A1 增加品项表与种子`。未 commit 不得开下一步。  
14. **小件只选中，不要数量区。** 大件选中后必须在胶囊下方出现数量步进区。确认/详情仍只顿号展示名称。

推荐顺序：

```
A 品项表 + 后端 CRUD + 管理端配置
   ↓
B 订单快照字段 + create 校验（居民端尚未改 UI）
   ↓
C 居民端 Step2：地址下方选品 + 电梯 / 楼层；未选则拦下一步
   ↓
D 确认页 + 各端详情展示（居民 / 员工 / PC / 小程序管理端）；列表不动
   ↓
E PC 管理端代下单补齐物品、电梯、楼层
```

A 不依赖 B。C 依赖 A 的公开接口和 B 的下单字段。D 依赖 C 已经能提交。E 依赖 B 的字段和 A 的品项列表。  
每步（含 A1 / A2 / A3）验收后 **先本地 commit**，再做下一步；不要 push。  
**Step1 现网不变。** 稿面两张图是 Step2，插在服务地址下面。  
**详情同一套字段**（§2.7）；列表一律不加。

---

## 0. 怎么叫

推荐产品名：**回收品项**。

| 层 | 现在叫什么 | 例子 |
|----|------------|------|
| 业务 | 废品回收 `BizType.RECYCLING` | — |
| 服务（服务配置里已有） | `ServiceCatalog` 名称 | 大件类、小件类 |
| **本次新增** | **回收品项** | 大件：单门柜、茶几；小件：纸张、金属 |

不采用的名字：回收品类（和大件/小件叠「类」）、回收价目（主体是物品不是价目表）、废品细项（菜单偏口语）。

| 用途 | 取值 |
|------|------|
| 中文 / 菜单 | 回收品项 |
| 模型 / 模块 | `RecyclingItem` / `recycling-item` |
| 表名 | `recycling_items` |
| 路由 | `/config/recycling-items` |
| `menuKey` | `config.recycling-items` |

---

## 1. 问题基线

废品回收现在只有两级：

```
废品回收
  ├─ 大件类（ServiceCatalog）
  └─ 小件类（ServiceCatalog）
```

居民预约现三步：

1. Step1：选大件类 / 小件类 + **预估重量（kg）**（保留，不删）。大件另有搬运提示。  
2. Step2：日历、时段、服务地址、代家人下单。  
3. Step3：确认。

订单 [`RecyclingOrder.itemType`](../apps/server/prisma/schema.prisma) 存服务目录名称（API `serviceItem`），没有具体物品、电梯、楼层。

稿面两张图是 **Step2** 的选品区（不是第一步）。插在 **服务地址下面**、代家人下单上面。第一步的分类卡片和预估重量不动。

---

## 2. 居民端稿面（已拍板）

两套 UI **共用一张品项表**，按 Step1 已选的服务目录切换（`name.includes('大件')` / `'小件'`）。

### 2.1 落在哪一步

```
Step1  选择服务     大件/小件卡片 + 预估重量（现网保留）
Step2  预约时间     日历 → 时段 → 服务地址 → 【稿面选品区】→ 代家人下单
Step3  确认订单     现网四行 + 回收物品（名称顿号）+ 电梯 + 大件楼层（§2.7）
```

选品区插在 [`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue) Step2 **服务地址块下面**、代家人下单上面。不要改第一步，不要用选品替换重量。

Step1 切分类 → 清空已选物品、电梯、楼层（楼层回到未选）。

### 2.2 对照

| | 小件 | 大件 |
|--|------|------|
| 标题 | 请选择物品 | 请选择物品 |
| 右上 | 无 | **价格表**（蓝字） |
| 价格怎么展示 | **就在选项上**：icon 下 `name` + `priceText`（与稿面一致，如 `0.6元/kg`） | 选品胶囊**不写价格**；点「价格表」**navigateTo 独立页**再看 |
| 选项形态 | 三列圆标：icon + 名称 + 价格 | 名称胶囊，无 icon、无价格 |
| 选中 | 圆标蓝色描边，**只切换选中**，下方**不要**数量区 | 胶囊蓝底白字；**选中后在胶囊下方新增数量区** |
| 多选 | 是，点再取消 | 是，点再取消 |
| 数量 | **无**（不要步进器、不要件数） | 仅已选项出现在下方列表：名称 + `- 数量 +`，点选时默认 1；减到 0 = 取消选中并从数量区移除 |
| 电梯 | 必选：有电梯 / 无电梯，**不预选** | 同左 |
| 搬运楼层 | **无** | 必选，**不预选** |
| 预估重量 | **Step1 保留**，本区不出现 | 同左 |

`priceText` 原样展示，不算钱、不换算单位。

### 2.3 小件（Step2 地址下方）

- 数据：当前分类下启用的回收品项。  
- 每个格子：**icon + 名称 + 价格文案**，与稿面一致。icon 优先后台图；失败或空 → 占位圆 + 名称首字。  
- **只做选中 / 取消**：点一下蓝圈选中，再点取消。可以多选。  
- **不要**在小件下方做数量列表、步进器、件数。入库 `quantity` 固定为 1。  
- 至少选 1 项才能进 Step3。  
- 电梯未选 → 拦 `nextStep` 2→3，toast **请选择是否有电梯**。

### 2.4 大件（Step2 地址下方）

布局两块，都在「请选择物品」里：

1. **胶囊区**：按 `sortOrder` 排布，可换行。只显示名称。点选中（蓝底），再点取消。  
2. **数量区**（紧挨胶囊下方）：**仅当至少选中 1 项时出现**。每条已选物品一行：左侧名称，右侧 `- 数量 +`。点胶囊选中时插入一行，数量默认 1；`+` 封顶 99；`-` 减到 0 则取消选中并从本区删掉该行。0 项时整块数量区隐藏。  

顺序：与选中顺序一致（或按 sortOrder，实现时定一种并保持）。  
**价格表**：点右上角 **跳到另一个页面**（`uni.navigateTo`，不要弹层、不要 web-view）。独立页只读列出该分类启用品项的 `name` + `priceText`，无选中、无下单。返回仍停留在预约 Step2。  
电梯规则同小件。  
搬运楼层：**不预选**（不要默认 1 层）。占位「请选择楼层」，picker `1`～`30`，选中后展示 `N层`。有电梯也要填。

### 2.5 大件价格表页

新建 `apps/miniapp-customer/src/pages/booking-recycling/price-list.vue`（或同目录 `price-list/index.vue`），[`pages.json`](../apps/miniapp-customer/src/pages.json) 登记，标题 **价格表**。query 带 `catalogId`（也可读预约 store 当前分类）。进入时拉 `GET /recycling-items/enabled?catalogId=`。列表展示 `name` + `priceText`（有 icon 可带）。空态 **暂无报价**。本页只读，不能改已选物品；返回后 Step2 选择仍在。

### 2.6 交互细则

- 未进 Step2 或未选分类：不渲染选品区。  
- 该分类 0 条启用品项：空态 **暂无回收物品**，不可进 Step3。  
- 「是否有电梯」用圆圈 radio，不要做成胶囊。  
- Step1 预估重量、大件搬运提示、服务须知里的重量文案 **都保留**。  
- Step2 日历 / 时段置灰 / 过近规则不改。  
- **`nextStep` 2→3 必选拦截**（在现有「日期、时段、地址、过近」之后，缺哪项 toast 哪项，一次只报一条）：

| 未选 | toast |
|------|--------|
| 回收物品 0 项 | **请选择回收物品** |
| 是否有电梯未点 | **请选择是否有电梯** |
| 大件且未选搬运楼层 | **请选择搬运楼层** |

小件不校验楼层。点置灰时段不要用这三条 toast。

### 2.7 确认页与各端详情（同一套字段）

前面选过的数据，**确认页和各端详情都要看见**，文案一致。列表一律不加。

| 行标签 | 取值 | 小件 | 大件 | 旧单无快照 |
|--------|------|------|------|------------|
| 回收类型 / 服务类型 | 目录名 | 有（现网） | 有 | 有 |
| 预估重量 | `Nkg` | 有（现网） | 有 | 有 |
| **回收物品** | 名称用 **顿号 `、`** 拼接 | 必有 | 必有 | **不渲染该行** |
| **是否有电梯** | `有电梯` / `无电梯` | 必有 | 必有 | 无值则不渲染 |
| **搬运楼层** | `N层` | **不渲染** | 必有 | 无值则不渲染 |
| 预约时间 / 地址 / 联系人 / 代下单 / 备注 | 现网 | 有 | 有 | 有 |

**回收物品怎么写（大件小件相同）**

- 条目标题固定：**回收物品**  
- 只展示 **`name`**，多项按选中顺序用顿号拼接。例：`纸张、金属、塑料`；`单门柜、茶几、餐桌`  
- **不展示** icon、`priceText`、数量（`×N`）。大件件数仍在 Step2 填写并写入快照，只是确认/详情不读 quantity。  
- 不链到价格表。

插在现有「预估重量」之后（居民确认页：重量与预约时间之间；员工 / 小程序管理端：重量与联系人之间；PC 详情抽屉：预估重量之后）。

对应文件（展示，不含列表）：

| 位置 | 文件 |
|------|------|
| 预约 Step3 确认 | [`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue) |
| 居民订单详情 | [`order-detail/index.vue`](../apps/miniapp-customer/src/pages/order-detail/index.vue) |
| 员工任务详情 | [`task-detail/index.vue`](../apps/miniapp-worker/src/pages/task-detail/index.vue) |
| PC 管理端详情 | [`orders/recycling/index.vue`](../apps/admin/src/views/orders/recycling/index.vue) 抽屉 |
| 小程序管理端详情 | [`apps/miniapp-admin/.../order-detail`](../apps/miniapp-admin/src/pages/order-detail/index.vue) |

**不要改**（先不动）：居民订单列表、员工首页/任务列表、PC 订单表格、小程序管理端订单列表。

---

## 3. 数据设计

### 3.1 层级

```
BizType.RECYCLING（管理端表单写死，品项表不存 bizType）
  └─ ServiceCatalog（大件类 / 小件类）
        └─ RecyclingItem（纸张、单门柜…）
```

父级 `catalogId` → `ServiceCatalog.id`。不要再存一份大件/小件枚举。

### 3.2 品项表 `recycling_items`

| 字段 | 说明 |
|------|------|
| `id` | 主键 |
| `catalogId` | 必须是 `bizType = RECYCLING` 的服务目录 |
| `name` | 纸张、单门柜 |
| `priceText` | 展示文案。小件画在 Step2 选项上；大件只在价格表页展示。如 `0.6元/kg`、`面议` |
| `icon` | 图标 URL，复用 `/upload/icon`。**小件选项要用；大件选品不用，价格表页可选用** |
| `sortOrder` | 越小越靠前，默认 `0` |
| `isEnabled` | 停用后公开接口不返回 |
| `createdAt` / `updatedAt` | 审计 |

约束：唯一 `(catalogId, name)`；索引 `(catalogId, isEnabled, sortOrder)`；relation 到 `ServiceCatalog`。

**禁止**：解析单价、JSON 扩展袋、树形、多业务复用本表。

删除 / 停用：

| 动作 | 规则 |
|------|------|
| 删除服务目录 | 仍有品项 → **400**：**请先删除该分类下的回收品项** |
| 停用服务目录 | 允许。公开列表要求父分类也启用 |
| 删除 / 停用品项 | 允许。已下的单靠快照，不受影响 |
| 父分类改名 | 仍挂 `catalogId` |

### 3.3 订单快照（`RecyclingOrder` 新增，旧单可空）

居民下单改为带物品和条件。`itemType`（API `serviceItem`）**仍存**大件类 / 小件类名称，不要改成「纸张」。

| 字段 | 说明 |
|------|------|
| `selectedItems` | `Json`。数组快照，见下 |
| `hasElevator` | `Boolean?`。有电梯 / 无电梯 |
| `carryFloor` | `Int?`。搬运楼层，仅大件；小件必须 `null` |

`selectedItems` 元素：

```ts
{
  itemId: number;   // 下单当时的品项 id，展示找不到则只用 name
  name: string;
  priceText: string;
  quantity: number; // 小件恒为 1；大件为步进器值。确认/详情只拼 name，不展示 quantity
}
```

`estimatedWeight`：**保留且居民 Step1 继续必填**，规则与现网相同（步长 5、最小 5）。不要用数量加总去填重量，也不要用选品替换重量。

居民 create **必填**：现有 `estimatedWeight` + `selectedItems` 至少 1 条 + `hasElevator` 非空。大件还要 `carryFloor`（1～30），每条 `quantity >= 1`。小件不要传 `carryFloor`（传了建议忽略）。

PC 代下单：E 步起与居民同一套必填；B 步完成时旧表单仍可不传这三字段，以免卡住现网。

### 3.4 谁可以改品项

- 写接口：`AdminJwtAuthGuard`，有菜单即可。  
- 公开读：`GET` 启用项，供居民 Step2、大件价格表页、PC 代下单。

---

## 4. 种子

[`apps/server/prisma/seed.ts`](../apps/server/prisma/seed.ts)，**表为空才插入**。按 `bizType = RECYCLING` 找名称含「大件」「小件」的目录；找不到则跳过该组并打日志。不要在 `main.ts` 启动补种。

`icon` 可空；`isEnabled = true`。大件没有稿面单价 → 种子用 `面议`，运营再改。

**小件（对齐稿面）**

| name | priceText | sortOrder |
|------|-----------|-----------|
| 纸张 | 0.6元/kg | 1 |
| 金属 | 1元/kg | 2 |
| 塑料 | 0.6元/kg | 3 |
| 织物 | 0.2元/kg | 4 |
| 小家电 | 1.5元/kg | 5 |
| 一袋式 | 0.6元/kg | 6 |

**大件（对齐稿面胶囊）**

| name | priceText | sortOrder |
|------|-----------|-----------|
| 单门柜 | 面议 | 1 |
| 双门柜 | 面议 | 2 |
| 三门及以上柜 | 面议 | 3 |
| 单人沙发 | 面议 | 4 |
| 双人沙发 | 面议 | 5 |
| 三人及以上沙发 | 面议 | 6 |
| 椅子 | 面议 | 7 |
| 茶几 | 面议 | 8 |
| 餐桌 | 面议 | 9 |
| 写字台 | 面议 | 10 |
| 单人无簧垫 | 面议 | 11 |
| 双人无簧垫 | 面议 | 12 |
| 单人弹簧垫 | 面议 | 13 |
| 双人弹簧垫 | 面议 | 14 |

---

## 5. 分步落地

口径在第 2～3 节。下面只写改哪些文件、按什么顺序做。

**每步验收通过后、开下一步前：把本步改动 git commit 到本地（不 push）。** A1、A2、A3、B、C、D、E 各一次。

### A. 品项配置（不改预约、不改订单表）

#### A1 Prisma + shared + 种子

改：

- [`schema.prisma`](../apps/server/prisma/schema.prisma)：`RecyclingItem` → `recycling_items`，字段见 3.2；`ServiceCatalog` 加 `recyclingItems`。`name` `VarChar(64)`，`priceText` `VarChar(32)`，`icon` 可空 `VarChar(512)`。  
- `apps/server`：`npx prisma migrate dev`  
- `packages/shared`：`RecyclingItemDto`（`id`、`catalogId`、`catalogName`、`name`、`priceText`、`icon`、`sortOrder`、`isEnabled`、时间戳）。不要 `bizType` 入库字段。  
- [`seed.ts`](../apps/server/prisma/seed.ts)：第 4 节，表为空才插入。

**验收：** migrate 成功；空库 seed 后两大类下有品项；再 seed 不覆盖已改金额。

#### A2 后端 CRUD + 公开查询

新建 `apps/server/src/modules/recycling-item/`，挂 [`app.module.ts`](../apps/server/src/app.module.ts)。对标 `service-catalog`。写接口 `AdminJwtAuthGuard`。`/enabled` 写在 `/:id` 前。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/recycling-items` | 分页；`catalogId`、`isEnabled`、`name` |
| GET | `/recycling-items/:id` | 详情 |
| POST | `/recycling-items` | 新增。父分类必须是废品；同分类重名 → 400 |
| PUT | `/recycling-items/:id` | 编辑 |
| PATCH | `/recycling-items/:id/toggle` | 启用停用 |
| DELETE | `/recycling-items/:id` | 删除 |
| GET | `/recycling-items/enabled` | `catalogId` 可选；只返回启用且父分类启用的项，按 `sortOrder`、`id` |

校验：父分类不是废品 / 不存在 → 400，文案 **请选择废品回收下的服务分类**。`priceText` 非空最长 32，不校验格式。

[`service-catalog.service.ts`](../apps/server/src/modules/service-catalog/service-catalog.service.ts) `remove`：该目录下还有品项 → 400。

单测：保洁 id 创建 → 400；重名 → 400；不同分类可同名；`enabled` 不含停用项 / 停用分类；删仍有品项的目录 → 400。

**验收：** Swagger 管理 CRUD + `GET /recycling-items/enabled?catalogId=` 可用。居民预约仍是旧 UI。

#### A3 PC 管理端页面 + 菜单

同步（漏一处则普通管理员进不去）：

- `apps/admin/src/views/config/recycling-items/index.vue`、`api/recycling-item.ts`  
- [`router/index.ts`](../apps/admin/src/router/index.ts)：`/config/recycling-items`，`menuKey: config.recycling-items`  
- [`layout/index.vue`](../apps/admin/src/layout/index.vue) 配置菜单 + `showConfigMenu`  
- [`menu-permissions.ts`](../apps/admin/src/constants/menu-permissions.ts) `MENU_TREE`  
- [`menu-keys.constant.ts`](../apps/server/src/modules/admin-permission/constants/menu-keys.constant.ts) `ALL_MENU_KEYS`

图标上传复用 [`service-icon.utils.ts`](../apps/admin/src/views/config/services/service-icon.utils.ts) 与 `POST /upload/icon`。

筛选：废品服务目录下拉 + 名称关键字。表格：所属业务（恒废品回收）、服务名称、名称、金额、图标、排序、状态、创建时间、操作。

弹窗：所属业务禁用写死废品回收；服务名称下拉只出废品分类；名称；金额（提示 **仅用于展示，不参与计价**）；图标；排序。body 只发 `catalogId`、`name`、`priceText`、`icon`、`sortOrder`。

无废品分类时，提交前 toast **请先在服务配置中新增废品回收分类**。已有管理员不会自动带新 menuKey；超管始终放行。

**验收：** 超管能开「回收品项」；不能挂到保洁分类；金额原文显示。

---

### B. 订单字段（居民端 UI 仍可先不选品）

改：

- Prisma `RecyclingOrder`：`selectedItems Json?`、`hasElevator Boolean?`、`carryFloor Int?`；migrate。  
- shared [`RecyclingOrderDto`](../packages/shared/src/entities/order.ts) / create DTO、server `toDto`：**出参也要带这三字段**（居民 / 员工 / PC / 小程序管理端详情都走同一订单 DTO）。**不要**把 `estimatedWeight` 改成可选。  
- [`recycling-order.service.ts`](../apps/server/src/modules/recycling-order/recycling-order.service.ts) `create`：  
  - 有 `selectedItems` 则校验至少 1 条、每条有 `name` / `priceText` / `quantity>=1`；下单时按 `itemId` 再查启用项，查到则覆盖 `name`/`priceText`；停用/删除 → 400 **请重新选择回收物品**。  
  - `serviceItem` 含「大件」则必须 `hasElevator` 非空且 `carryFloor` 在 1～30；含「小件」则必须 `hasElevator`，`carryFloor` 存 `null`。  
  - **无** `selectedItems`（B 步时 PC 旧代下单）→ 不拦，仍要重量。E 步起 PC 表单会带上这三字段。  
- 单测：小件带楼层被清空；大件缺楼层 400；空数组 400；不传新品项仍成功。

不改：预约页、确认页、管理端代下单表单、各端详情。

**验收：** 直调 create 带选品 + 电梯能入库；旧代下单 payload 仍成功。

---

### C. 居民端 Step2 选品 + 大件价格表页

改：

- 新建 `apps/miniapp-customer/src/api/recycling-item.ts`：拉 `GET /recycling-items/enabled?catalogId=`。  
- [`booking-recycling.ts`](../apps/miniapp-customer/src/store/booking-recycling.ts)：新增 `selectedItems`、`hasElevator`（`true | false | null`）、`carryFloor`（`number | null`，**默认 null，不要默认 1**）。**保留 `estimatedWeight`。** `reset` / 切换 `selectedCatalog` 时清空选品、电梯、楼层。  
- [`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue)：  
  1. **Step1 不改**：卡片、大件提示、预估重量步进器、1→2 校验仍是「已选分类」。  
  2. **Step2**：在**服务地址块之后、代家人下单之前**插入选品 + 条件。小件只选中；大件选中后下方出数量区（§2.3～2.4）。  
  3. 进入 Step2 或切回本页时按 `selectedCatalog.id` 拉 enabled 列表。  
  4. `nextStep` 2→3：现有日期 / 时段 / 地址 / 过近之后，按 §2.6 拦未选物品、未选电梯、大件未选楼层。  
- 新建 `pages/booking-recycling/price-list`（§2.5）：只给大件右上角跳转；小件不要这个入口。登记 `pages.json`。

不改：Step1 重量 UI；Step2 日历 / 时段 / 地址 / 代下单相对顺序（只在地址和代下单之间插入）；不要在这一步改确认页。

**验收：** Step1 仍能改重量；Step2 地址下方出现选品。未选物品 / 电梯 / 大件楼层点下一步分别 toast，进不了 Step3。选齐后能进。

---

### D. 确认页 + 各端详情（列表不动）

展示口径见 §2.7。本步才改确认页和详情（C 不要提前改）。**禁止改任何订单列表。**

改：

- 预约 Step3 [`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue)：在「预估重量」和「预约时间」之间插入 **回收物品**（名称顿号）、是否有电梯；大件再插搬运楼层。现有四行保留。提交带上原有字段 + `selectedItems`、`hasElevator`、`carryFloor`（小件不传楼层）。  
- 居民 [`order-detail/index.vue`](../apps/miniapp-customer/src/pages/order-detail/index.vue)：废品订单信息同样三行；DTO 补字段。旧单无快照不渲染新行。  
- 员工 [`task-detail/index.vue`](../apps/miniapp-worker/src/pages/task-detail/index.vue) + [`api/order.ts`](../apps/miniapp-worker/src/api/order.ts)：重量后插入同一套。列表 / 首页不改。  
- PC 详情抽屉 [`orders/recycling`](../apps/admin/src/views/orders/recycling/index.vue)：预估重量后加同一套。**本步不要改「新增订单」表单（E 步）。**  
- 小程序管理端 [`order-detail`](../apps/miniapp-admin/src/pages/order-detail/index.vue)：废品同样补齐。订单列表不改。

**验收：** 新单在确认页、居民详情、员工详情、PC 详情、小程序管理端详情都能看到顿号拼接的回收物品，以及电梯（大件有楼层）；各端列表仍只有大件类/小件类。

---

### E. PC 管理端代下单补齐

改 [`orders/recycling/index.vue`](../apps/admin/src/views/orders/recycling/index.vue) **新增订单**弹窗（现网已有服务类型 + 预估重量）：

- 选了服务类型后，按该废品 `catalogId` 拉启用品项。  
- **回收物品**多选，必填。大件每项可填数量（默认 1，与居民 Step2 相同，入库用）。小件无数量。  
- **是否有电梯**必选。  
- 服务类型为大件时 **搬运楼层**必选（1～30），小件不出现该表单项。  
- 提交带 `selectedItems`、`hasElevator`、`carryFloor`；未选齐不提交，文案与 §2.6 一致（请选择回收物品 / 请选择是否有电梯 / 请选择搬运楼层）。  
- 切服务类型时清空已选物品、电梯、楼层。

后端：管理端 create 带上这三字段后走与居民相同校验。

**验收：** PC 代下单不选物品/电梯（大件不选楼层）不能提交；提交成功后详情能看到顿号拼接的回收物品。

---

## 6. 本次不做

- 大件价格表做成弹层 / 半屏（必须独立页）  
- 用 `priceText` × 重量 / 数量算参考金额（`referenceAmount` 仍封存）  
- 确认/详情展示价格、icon、数量（只展示名称顿号）  
- 任何订单**列表**展示物品 / 电梯 / 楼层  
- 把品项嵌进「服务配置」树表  
- 服务目录增加「大件/小件」新枚举字段  
- 改 [`code-update-steps.md`](./code-update-steps.md)

---

## 7. 总验收（A～E 都做完）

1. 运营能在「回收品项」下给大件/小件增改物品、金额文案、图标、排序。  
2. Step1 仍选分类并填写预估重量。  
3. Step2 未选物品、电梯、大件楼层时点下一步会 toast，不能进确认页。  
4. 确认页与居民 / 员工 / PC / 小程序管理端详情：回收物品为名称顿号拼接，另有电梯；大件有楼层。不展示价格和数量。  
5. PC 代下单能选物品、电梯、大件楼层并落库。  
6. 各端订单列表仍不展示这些新字段。旧单详情缺新行但不崩。
