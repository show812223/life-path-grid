# Viewer COBie 篩選器 — 設計規格

- 日期：2026-05-12
- 範圍：`app/pages/viewer/[id].vue`（單一模型的 3D 檢視頁）
- 狀態：設計待實作

## 目標

讓使用者在 viewer 頁直接組合多個 COBie 條件來圈選並上色模型中的構件。
核心場景：選一個 `COBie.Type.Name`，自動展開為「同 `COBie.Type.Category`」的所有元件並變色；
再依 COBie 任意維度（Manufacturer、Floor、Space、System、Attribute…）漸進收窄。

## 範圍邊界

- **單一模型**：viewer 頁本就只看一個 model，篩選器只作用於當前 model
- **單組高亮**：採漸進收窄（progressive narrowing），任何時間只有一組命中集合
- **單色 + ghost**：命中元件用固定強調色，非命中以 Forge `isolate` 的內建 ghost 呈現
- **不修改資料**：viewer 只讀，篩選不影響 store

## §1 — UI 結構與互動

### 位置
- viewer 頁右側 rail 第 4 個 tab，icon `mdi-filter-variant`、標題「篩選」
- 與現有 `COBie 資料 / 設備文件 / 物件詳細` 三個 tab 並列

### 內部佈局（由上至下）

1. **Header**：標題、清除全部按鈕、命中數字徽章（`28 / 1,240`）
2. **條件清單區（FilterChain）**：每個條件一張 row card，順序代表收窄順序
3. **加入按鈕**：「+ 加入條件 (AND)」、「+ OR 群組」
4. **結果摘要**：命中 N 筆、依 Type.Name 分群清單、「Fit to view」、「匯出 ExtIDs」
5. **行為按鈕**：「套用到模型」toggle（預設 on）

### OR 群組視覺

```
① Type.Category = HVAC                        (AND)
┌─ OR ──────────────────────────────────┐
│ ② Manufacturer = Trane                 │
│ ③ Manufacturer = Carrier               │
│ ④ Floor.Name = 3F                      │
└────────────────────────────────────────┘  (AND)
⑤ Component.Area ≥ 100
```

語意：`① AND (② OR ③ OR ④) AND ⑤`

### 互動細節
- 條件變更即時重算（debounce 200ms）
- 任一條件結果為空 → 紅色提示「此條件後無命中」
- OR 群組只剩 1 個 sub-condition 時自動降為 single；空群組自動移除
- rail 收起時篩選仍生效；rail 重開回到原條件
- OR 群組內**不再嵌套** OR（避免無限層級）

## §2 — 篩選引擎資料模型

### 型別

```ts
type Operator = 'eq' | 'in' | 'contains' | 'range' | 'dateRange' | 'exists'

interface FilterCondition {
  id: string
  dimensionId: string
  op: Operator
  value: any           // 依 op：string | string[] | {min,max} | {from,to}
  attrName?: string    // Attribute 維度的第一段值
}

type ChainItem =
  | { kind: 'single'; condition: FilterCondition }
  | { kind: 'orGroup'; id: string; conditions: FilterCondition[] }

interface FilterChain {
  items: ChainItem[]   // items 之間 AND，群組內 OR
  enabled: boolean
}
```

### 維度註冊表（FilterDimension）

```ts
interface FilterDimension {
  id: string
  label: string
  group: 'Type' | 'Component' | 'Space' | 'Floor' | 'Zone' | 'System' | 'Attribute'
  ops: Operator[]
  expandsTypeCategory?: boolean   // 只 'type.name' = true
  loadOptions: (ctx: FilterCtx) => Promise<string[]>
  evaluate: (ctx: FilterCtx, op: Operator, value: any) => Set<string>
}
```

### 維度清單（依 sample SampleCOBieSpreadsheet.xlsx 驗證涵蓋）

| dimensionId | XLSX 來源 | ops |
|---|---|---|
| `type.name` (預設起點) | Type.Name | eq, in |
| `type.category` | Type.Category | eq, in |
| `type.manufacturer` | Type.Manufacturer | eq, contains |
| `type.modelNumber` | Type.ModelNumber | eq, contains |
| `type.assetType` | Type.AssetType | eq |
| `component.name` | Component.Name | contains |
| `component.tagNumber` | Component.TagNumber | eq, contains |
| `component.serialNumber` | Component.SerialNumber | eq, contains |
| `component.assetIdentifier` | Component.AssetIdentifier | eq, contains |
| `component.barCode` | Component.BarCode | eq, contains |
| `component.area` | Component.Area | range |
| `component.length` | Component.Length | range |
| `component.installationDate` | Component.InstallationDate | dateRange |
| `component.warrantyStartDate` | Component.WarrantyStartDate | dateRange |
| `space.name` | Space.Name | eq, in |
| `space.category` | Space.Category | eq, in |
| `floor.name` | Floor.Name | eq, in |
| `zone.name` | Zone.Name | eq, in |
| `zone.category` | Zone.Category | eq, in |
| `system.name` | System.Name | eq, in |
| `system.category` | System.Category | eq, in |
| `attr` | Attribute（兩段：attrName + value） | eq, contains, range |

### 自動展開規則（Type.Category）

- **只在第一個 item 內** 的 `type.name` 條件觸發
- 算法：取命中 components → 反查 `typeName` → 取出 categories → 撈所有 type 同 category → 聚合 components

```ts
function expandToSameCategory(ctx, typeMatchedIds: Set<string>): Set<string> {
  const cats = new Set<string>()
  for (const id of typeMatchedIds) {
    const c = ctx.components.find(c => c.externalId === id)
    const t = c?.typeName ? ctx.types.get(c.typeName) : undefined
    if (t?.category) cats.add(t.category)
  }
  const result = new Set<string>()
  for (const t of ctx.types.values()) {
    if (t.category && cats.has(t.category)) {
      for (const id of ctx.byType.get(t.name) ?? []) result.add(id)
    }
  }
  return result
}
```

### Attribute 維度擴散規則

依 Attribute row 的 `SheetName` 決定目標範圍：

- `SheetName=Component`、`RowName=componentName` → 該 component
- `SheetName=Type`、`RowName=typeName` → 該 type 旗下**所有** components
- `SheetName=Space`、`RowName=spaceName` → 該 space 旗下所有 components

### FilterCtx（預建索引）

```ts
interface FilterCtx {
  modelId: string
  components: ExtractedComponent[]
  types: Map<string, ExtractedType>
  spaces: Map<string, ExtractedSpace>
  floors: Map<string, ExtractedFloor>
  zones: ExtractedZone[]
  systems: ExtractedSystem[]
  attributesIndex: Map<string, ExtractedAttribute[]>  // key = `${sheet}::${rowName}`
  bySpace: Map<string, Set<string>>
  byFloor: Map<string, Set<string>>
  byZone: Map<string, Set<string>>
  bySystem: Map<string, Set<string>>
  byType: Map<string, Set<string>>
}
```

由 `buildFilterCtx(modelId)` 組裝一次並 cache（在 store reload 時失效）。

### Evaluate 流程

```ts
function evaluateItem(item, ctx, isFirst): Set<string> {
  if (item.kind === 'single') {
    let s = ctx.dim(item.condition.dimensionId).evaluate(ctx, item.condition.op, item.condition.value)
    if (isFirst && shouldExpand(item.condition)) s = expandToSameCategory(ctx, s)
    return s
  }
  // orGroup
  const acc = new Set<string>()
  for (const c of item.conditions) {
    let s = ctx.dim(c.dimensionId).evaluate(ctx, c.op, c.value)
    if (isFirst && shouldExpand(c)) s = expandToSameCategory(ctx, s)
    for (const id of s) acc.add(id)
  }
  return acc
}

function evaluateChain(chain, ctx) {
  let acc: Set<string> | null = null
  const perStep: Set<string>[] = []
  for (const [i, item] of chain.items.entries()) {
    const s = evaluateItem(item, ctx, i === 0)
    acc = acc === null ? s : intersect(acc, s)
    perStep.push(acc)
    if (acc.size === 0) return { perStep, finalSet: acc, emptyAtStep: i }
  }
  return { perStep, finalSet: acc ?? allComponentIds(ctx) }
}
```

## §3 — Highlight 繪製與 Forge 整合

### 渲染策略：兩層疊加

1. **Ghost 層**：`viewer.isolate(matchedDbIds, model)` — 非命中自動 ghost（內建副作用）
2. **顏色層**：對每個命中 dbId 呼叫 `viewer.setThemingColor(id, COLOR_HIT, model)`

### 顏色常數（首版固定）

```ts
const COLOR_HIT = new THREE.Vector4(1.0, 0.55, 0.0, 0.9)  // 暖橘
```

### ExternalId → DbId 對照快取

- 每個 model 物件 cache 一份（`WeakMap<model, Record<extId, dbId>>`）
- 取得失敗時 mapping 為 `{}`，命中數為 0 但不上色不報錯

### 套用流程

```ts
async function applyHighlight(viewer, externalIds: Set<string>) {
  const map = await getMapping(viewer)
  const dbIds = [...externalIds].map(e => map[e]).filter(n => typeof n === 'number')
  viewer.clearThemingColors(viewer.model)
  if (dbIds.length === 0) {
    viewer.isolate([])
    return { hitDbIds: [], missing: externalIds.size }
  }
  viewer.isolate(dbIds)
  for (const id of dbIds) viewer.setThemingColor(id, COLOR_HIT, viewer.model)
  return { hitDbIds: dbIds, missing: externalIds.size - dbIds.length }
}

function clearHighlight(viewer) {
  viewer.clearThemingColors(viewer.model)
  viewer.isolate([])
}
```

### 與既有功能的互動

- 篩選 enabled 且 `finalSet.size > 0` 時：COBie tab 點選改為「select + fitToView 不 isolate」
- 使用者若手動觸發 focus → 篩選自動 disable，toast 提示
- 切 view（同 model 換 SVF view）→ mapping cache 失效、自動重套
- 切離 viewer 頁 → unmount 清除 highlight

### 生命週期

| 事件 | 動作 |
|---|---|
| 條件變更 | debounce 200ms 重算並套 highlight |
| `enabled = false` | clearHighlight，保留 chain |
| view 切換 | 自動重套 |
| 離開頁面 | clearHighlight |

### 邊界處理

| 情況 | 行為 |
|---|---|
| externalId 在 model 中找不到 dbId | 計入 `missing`，UI 標示 |
| viewer 尚未 ready | defer 到 `onViewerReady` |
| 命中 > 5000 件 | 不做特殊處理；觀察實測再決定是否 batch |
| 條件鏈執行中又有變更 | 用 `requestId` token，過期結果丟棄 |

## §4 — 檔案結構、模組邊界、測試

### 新增檔案

```
app/
├── composables/
│   ├── filterRegistry.ts        [新] 維度註冊表
│   ├── filterEngine.ts          [新] 純函式：evaluateChain/Item, expandToSameCategory
│   ├── useFilterCtx.ts          [新] buildFilterCtx + 索引
│   ├── useViewerHighlight.ts    [新] mapping cache + apply/clearHighlight
│   └── useCobieFilter.ts        [新] facade：chain state + ctx + viewer
├── components/
│   ├── CobieFilterPanel.vue     [新] rail tab root
│   ├── FilterConditionCard.vue  [新] 單條件 card
│   ├── FilterOrGroupCard.vue    [新] OR 群組 card
│   └── FilterValueInput.vue     [新] 依 op 渲染輸入控件
└── pages/viewer/
    └── [id].vue                 [改] 加第 4 個 tab、引入 useCobieFilter
```

### 模組邊界

| 模組 | 職責 | 禁止 |
|---|---|---|
| `filterRegistry` | 維度宣告，純資料 + 純函式 | 接 Vue、操作 viewer |
| `filterEngine` | evaluate 邏輯，純函式 | 接 Vue、操作 viewer、查 store |
| `useFilterCtx` | 從 store 組 ctx + 索引 | 操作 viewer |
| `useViewerHighlight` | mapping cache、apply/clear | 知道 chain 結構 |
| `useCobieFilter` | facade：串 chain ↔ ctx ↔ viewer | 直接寫 UI 樣式 |
| `CobieFilterPanel` | UI root | 算邏輯 |
| `FilterConditionCard` / `FilterOrGroupCard` | 純呈現 | 查 store |
| `FilterValueInput` | 依 op 切換輸入控件 | 知道 viewer |

依賴圖（無循環）：

```
viewer/[id].vue
  └─ CobieFilterPanel
       └─ useCobieFilter ────── useViewerHighlight ──── (Forge API)
            ├─ useFilterCtx ─── useCobieStore
            └─ filterEngine ─── filterRegistry
```

### useCobieFilter return shape

```ts
{
  chain: Ref<FilterChain>,
  result: Ref<{
    finalSet: Set<string>,
    perStep: Array<{ itemId: string; count: number }>,
    emptyAtStep?: number,
    missingInModel: number
  }>,
  enabled: Ref<boolean>,
  addCondition(dimensionId: string): void,
  addOrGroup(): void,
  removeItem(itemId: string): void,
  updateCondition(itemId: string, patch: Partial<FilterCondition>): void,
  clearAll(): void,
  exportExtIds(): string
}
```

### 測試

**Vitest 單元測試**：

1. `filterEngine.test.ts`：mock ctx，驗 AND 鏈、OR 群組、自動展開、空集合短路、perStep 累計
2. `filterRegistry.test.ts`：各維度的 evaluate 對齊預期；重點 Attribute 擴散
3. `useFilterCtx.test.ts`：用 sample xlsx → parseCobieXlsx 產 fixture，驗索引正確

**手動驗收**：
- 案例 1：`Type.Name = "M_Return Diffuser..."` → 同 `Type.Category` 全部上色
- 案例 2：上面加 `Floor.Name = "First Floor"` → 縮到一樓
- 案例 3：加 OR 群組「Manufacturer = X」OR「Manufacturer = Y」→ 交集正確
- 案例 4：清除全部 → 模型還原

**E2E**：暫不寫（Forge + WebGL 成本高）

### 風險

| 風險 | mitigation |
|---|---|
| Forge mapping 取得失敗 | fallback：只顯示清單不上色 |
| Attribute distinct names 過多卡頓 | Autocomplete + 搜尋字串 ≥ 2 字才查 |
| OR 群組增減後結構混亂 | 1 條件時自動降 single、空群組移除 |
| 既有 focus 與篩選互踩 | §3 已定 — 篩選啟用時 COBie 點選改 select + fitToView |
| 索引大小 | sample 3,956 件 < 1MB；session 內，不持久化 |

### 暫不做（YAGNI）

- Preset 存/載（具名）
- 跨 model 篩選
- 群組多色
- 編輯 COBie
- 匯出 XLSX
