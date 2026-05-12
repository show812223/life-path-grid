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
- **Pass-through 規則**：條件的 `value` 為空（或群組內沒有有效 condition）視為 pass-through（不收窄、不參與運算），UI 上顯示 placeholder「未設定值」
- 任一條件結果為空（空集合）→ 紅色提示「此條件後無命中」
- OR 群組只剩 1 個 sub-condition 時自動降為 single；空群組自動移除
- OR 群組內**不再嵌套** OR（避免無限層級）
- **同維度多值的引導**：dropdown 預設用 `op=in` 多選 chip（單卡片內 OR）；OR 群組保留給**跨維度**的 OR 場景
- **結果分群顯示排序**：依 Type.Name 分群，群組依命中數降冪、群組內依 Component.Name 字母升冪
- **rail 收起時的最小可視回饋**：畫布上方顯示一條 thin status bar `篩選 28 / 1240 件 [清除]`，讓使用者隨時知道篩選還生效著，可一鍵清除

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
}
// 註：UI「套用到模型」開關不放在 FilterChain，而是 useCobieFilter 的獨立 `enabled` ref，
//     讓 chain 保持「純資料」屬性，避免 UI 狀態汙染。
```

### 維度註冊表（FilterDimension）

```ts
interface FilterDimension {
  id: string
  label: string
  group: 'Type' | 'Component' | 'Space' | 'Floor' | 'Zone' | 'System' | 'Attribute'
  ops: Operator[]
  expandsTypeCategory?: boolean   // 只 'type.name' = true
  loadOptions: (ctx: FilterCtx) => string[]   // 同步：候選值都在 ctx 內
  /** 若 value 視為空/未設定，evaluate 不該被呼叫；engine 會先過濾 pass-through */
  evaluate: (ctx: FilterCtx, op: Operator, value: any) => Set<string>
}

/** 判斷一個 condition 的 value 是否視為「未設定 / pass-through」 */
function isConditionActive(c: FilterCondition): boolean {
  if (c.value === undefined || c.value === null || c.value === '') return false
  if (Array.isArray(c.value) && c.value.length === 0) return false
  if (typeof c.value === 'object' && c.value !== null) {
    // range / dateRange：min/max/from/to 至少一邊有值
    return Object.values(c.value).some(v => v !== undefined && v !== null && v !== '')
  }
  return true
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
| `attr` | Attribute（兩段：attrName + value） | eq, contains（首版） |

> **Attribute 的 range 暫不實作**：Attribute.Value 是字串，是否可數字比較取決於 Attribute.Unit。首版只支援 eq / contains，當 attribute value 是數字字串時等同精確比對。range / dateRange 列為未來擴充。

### 自動展開規則（Type.Category）

- 觸發條件函式（顯式宣告）：
  ```ts
  const shouldExpand = (c: FilterCondition) => c.dimensionId === 'type.name'
  ```
- 觸發位置：**第一個 active item 內**（不是 `chain.items[0]`，因為前面可能有 pass-through item 被跳過）
- 第一個 active item 若為 OR 群組：實作上可優化為「群組內所有 type.name 命中先 union 再呼叫 expand 一次」（與「各自展開後 union」結果等價，因為 expand 內部已將 categories 合併處理）
- 其他維度永不展開
- 算法：取命中 components → 反查 `typeName` → 取出 categories → 撈所有 type 同 category → 聚合 components

```ts
function expandToSameCategory(ctx, typeMatchedIds: Set<string>): Set<string> {
  const cats = new Set<string>()
  for (const id of typeMatchedIds) {
    const c = ctx.byExternalId.get(id)              // O(1)，見 FilterCtx
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
  byExternalId: Map<string, ExtractedComponent>     // 主鍵索引，自動展開 hot path 用
  types: Map<string, ExtractedType>
  spaces: Map<string, ExtractedSpace>
  floors: Map<string, ExtractedFloor>
  zones: ExtractedZone[]
  systems: ExtractedSystem[]
  attributesIndex: Map<string, ExtractedAttribute[]>  // key = `${sheet}::${rowName}`
  bySpace: Map<string, Set<string>>      // SpaceName → component externalIds
  byFloor: Map<string, Set<string>>      // FloorName → component externalIds（透過 Space.FloorName 聚合）
  byZone: Map<string, Set<string>>       // ZoneName → component externalIds（透過 Zone.SpaceNames → Space → Component）
  bySystem: Map<string, Set<string>>     // SystemName → component externalIds（直接讀 ExtractedSystem.componentExternalIds）
  byType: Map<string, Set<string>>       // TypeName → component externalIds（從 Component.typeName 反向聚合）
  /** 解析維度註冊表。讓 filterEngine 不需直接 import filterRegistry。 */
  dim: (dimensionId: string) => FilterDimension
}
```

由 `buildFilterCtx(modelId)` 組裝一次並 cache（在 store reload 時失效）。

**索引構建步驟**（在 `useFilterCtx.ts` 內）：

```ts
// 小工具
const addToMap = <K, V>(m: Map<K, Set<V>>, k: K, v: V) => {
  let s = m.get(k); if (!s) { s = new Set<V>(); m.set(k, s) }; s.add(v)
}
const pushToMap = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const arr = m.get(k); if (arr) arr.push(v); else m.set(k, [v])
}

// 1. byExternalId / bySpace / byType — 從 components 一次掃過
for (const c of components) {
  byExternalId.set(c.externalId, c)
  if (c.space) addToMap(bySpace, c.space, c.externalId)
  if (c.typeName) addToMap(byType, c.typeName, c.externalId)
}

// 2. byFloor — 用 spaces 的 floorName 聚合
for (const s of spaces) {
  if (!s.floorName) continue
  const ids = bySpace.get(s.name) ?? new Set<string>()
  for (const id of ids) addToMap(byFloor, s.floorName, id)
}

// 3. byZone — 兩跳：Zone.spaceNames → Space → bySpace
for (const z of zones) {
  for (const sn of z.spaceNames) {
    for (const id of bySpace.get(sn) ?? []) addToMap(byZone, z.name, id)
  }
}

// 4. bySystem — 直接從 system.componentExternalIds 取
for (const sys of systems) {
  for (const id of sys.componentExternalIds) addToMap(bySystem, sys.name, id)
}

// 5. attributesIndex — key 為 `${sheet}::${rowName}`，注意 sheet/rowName 做 trim+lowercase 標準化
for (const a of attributes) {
  if (!a.sheetName || !a.rowName) continue
  const k = `${a.sheetName.trim().toLowerCase()}::${a.rowName.trim().toLowerCase()}`
  pushToMap(attributesIndex, k, a)
}
```

### Evaluate 流程

引擎只在「至少有一個 active condition」時才回傳 finalSet；否則回 `{ active: false }` 由 useCobieFilter / UI 決定不上色、不顯示「N/全集」。

```ts
type EvaluateResult =
  | { active: false }                                   // chain 內無 active condition
  | {
      active: true
      perStep: Array<{ itemId: string; count: number }>
      finalSet: Set<string>
      emptyAtStep?: number                              // 該步出現空集合
    }

/** chain item 的穩定 key（給 perStep 對應 UI） */
const itemKey = (item: ChainItem): string =>
  item.kind === 'single' ? item.condition.id : item.id

function evaluateItem(item: ChainItem, ctx: FilterCtx, isFirst: boolean): Set<string> | null {
  if (item.kind === 'single') {
    if (!isConditionActive(item.condition)) return null
    let s = ctx.dim(item.condition.dimensionId).evaluate(ctx, item.condition.op, item.condition.value)
    if (isFirst && shouldExpand(item.condition)) s = expandToSameCategory(ctx, s)
    return s
  }
  // orGroup — 將 type.name 命中先合併再 expand 一次（優化）
  let any = false
  const acc = new Set<string>()
  const typeNameUnion = new Set<string>()
  for (const c of item.conditions) {
    if (!isConditionActive(c)) continue
    any = true
    const s = ctx.dim(c.dimensionId).evaluate(ctx, c.op, c.value)
    if (isFirst && shouldExpand(c)) {
      for (const id of s) typeNameUnion.add(id)
    } else {
      for (const id of s) acc.add(id)
    }
  }
  if (typeNameUnion.size > 0) {
    const expanded = expandToSameCategory(ctx, typeNameUnion)
    for (const id of expanded) acc.add(id)
  }
  return any ? acc : null      // 群組內全部空 → 群組視為 pass-through
}

function evaluateChain(chain: FilterChain, ctx: FilterCtx): EvaluateResult {
  let acc: Set<string> | null = null
  const perStep: Array<{ itemId: string; count: number }> = []
  let isFirstApplied = true                  // 標記「第一個 active item」用於 Type.Category 展開
  let emptyAtStep: number | undefined
  for (const [i, item] of chain.items.entries()) {
    const s = evaluateItem(item, ctx, isFirstApplied)
    if (s === null) continue                  // pass-through
    isFirstApplied = false
    acc = acc === null ? s : intersect(acc, s)
    perStep.push({ itemId: itemKey(item), count: acc.size })
    if (acc.size === 0) { emptyAtStep = i; break }
  }
  if (acc === null) return { active: false }  // 全部 pass-through
  return { active: true, perStep, finalSet: acc, emptyAtStep }
}
```

**注意**：「第一個 active item」而非「`chain.items[0]`」才能觸發自動展開。這樣前面有 pass-through item 時仍正確。

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
- 切 view（同 model 換 SVF view）會載新 model 物件 → WeakMap 自然找不到舊 key → cache 自動失效（無需手動清）
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

- 篩選 enabled 且 `result.active && finalSet.size > 0` 時：COBie tab 點選改為「select + fitToView **不** isolate」（避免推翻篩選 ghost 層）
- 使用者若手動觸發 focus（例如點 COBie tab 的 mdi-cube-scan 按鈕） → 篩選自動 disable，toast 提示「篩選暫停 — 因手動選取了元件」
- **手動 focus 偵測機制**：useCobieFilter 暴露 `notifyManualFocus()` 方法；`viewer/[id].vue` 內既有 `focusElements()` 結尾呼叫一次該方法即可。useCobieFilter 收到後設 `enabled = false` 並 emit toast。（用顯式呼叫而非監聽 viewer 事件，避免「自己呼叫的 isolate 也觸發自我關閉」的悖論）
- 切 view（同 model 換 SVF view）→ mapping 自然失效、篩選結果自動重套（透過 watch 重新呼叫 applyHighlight）
- 切離 viewer 頁 → unmount 清除 highlight

### useViewerHighlight 對外介面

```ts
export interface UseViewerHighlight {
  applyHighlight(viewer: any, externalIds: Set<string>): Promise<{ hitDbIds: number[]; missing: number }>
  clearHighlight(viewer: any): void
  /** 對最近一次 applyHighlight 的命中集合 fitToView。沒有命中或 viewer 未 ready 時 no-op。 */
  fitToHighlight(viewer: any): Promise<void>
}
```

`fitToHighlight` 內部留一份 `lastHitDbIds: number[]`，篩選器「Fit to view」按鈕直接呼叫此方法。

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
| 條件鏈執行中又有變更 | 用 `requestId` token，過期結果丟棄（見下） |

**requestId 機制**（位於 `useCobieFilter`，不污染純函式引擎）：

```ts
let requestId = 0
watch(chain, async () => {
  const my = ++requestId
  await debounceTick(200)
  if (my !== requestId) return                 // 已被後續變更取代
  const r = evaluateChain(chain.value, ctx)
  if (my !== requestId) return
  if (r.active && enabled.value) {
    const { missing } = await applyHighlight(viewer, r.finalSet)
    if (my !== requestId) return
    result.value = { ...r, missingInModel: missing }
  } else {
    clearHighlight(viewer)
    result.value = { active: false }
  }
}, { deep: true })
```

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
│   ├── CobieFilterStatusBar.vue [新] rail 收起時的 thin status bar（畫布上方）
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
| `CobieFilterStatusBar` | rail 收起時顯示 `篩選 N / M 件 [清除]`，只在 `enabled && result.active` 時 render | 算邏輯、操作 viewer |
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
  /** 引擎輸出 + Forge mapping 後的 missing 計數合併 */
  result: Ref<
    | { active: false }
    | {
        active: true
        finalSet: Set<string>
        perStep: Array<{ itemId: string; count: number }>
        emptyAtStep?: number
        missingInModel: number   // 在 model 中找不到 dbId 的 externalId 數
      }
  >,
  enabled: Ref<boolean>,            // 「套用到模型」toggle
  addCondition(dimensionId: string): void,
  addOrGroup(): void,
  addConditionToGroup(groupId: string, dimensionId: string): void,
  removeItem(itemId: string): void,
  removeConditionFromGroup(groupId: string, conditionId: string): void,
  updateCondition(conditionId: string, patch: Partial<FilterCondition>): void,
  clearAll(): void,
  /** 通知「使用者手動 focus 了元件」→ 自動 disable 篩選並 emit toast */
  notifyManualFocus(): void,
  exportExtIds(): string            // 命中 externalIds 換行串接
}
```

**資料流**：
1. `chain` 變動 → debounce 200ms → `evaluateChain(chain, ctx)` 算出 `EvaluateResult`
2. 若 `active && enabled` → 呼叫 `useViewerHighlight.applyHighlight(viewer, finalSet)` 得 `{ missing }`
3. 把 `missing` 合併進 `result` 寫回 ref → UI 顯示 `28 / 1240`（perStep 最後一筆）與「3 件未在模型」

### 測試

**Vitest 單元測試**：

1. `filterEngine.test.ts`：mock ctx，驗 AND 鏈、OR 群組、自動展開、空集合短路、perStep 累計
2. `filterRegistry.test.ts`：各維度的 evaluate 對齊預期；重點 Attribute 擴散
3. `useFilterCtx.test.ts`：用 sample xlsx → parseCobieXlsx 產 fixture，驗索引正確

**手動驗收**：
- 案例 1：`Type.Name = "M_Return Diffuser..."` → 同 `Type.Category` 全部上色
- 案例 2：上面加 `Floor.Name = "First Floor"` → 縮到一樓
- 案例 3：加 OR 群組「Manufacturer = Trane」OR「Manufacturer = Carrier」→ 群組內為兩廠商 union；再與案例 1 的 Type 條件取交集
- 案例 4：清除全部 → 模型還原（無 ghost、無 theming color）
- 案例 5：手動點 COBie tab 的 mdi-cube-scan focus 一個構件 → 篩選 toggle 自動關閉、toast 出現、模型 isolate 成單一構件
- 案例 6：rail 收起後篩選仍生效，畫布上方出現 thin status bar；按其中的「清除」可清掉篩選

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
