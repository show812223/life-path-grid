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
   - 兩個按鈕的 UI flow 相同：點開後**先**展開維度選單；使用者選定維度後才呼叫 `addCondition(dimId)` 或 `addOrGroup(dimId)`（OR 群組必帶第一個 sub-condition，無「空群組」狀態）
   - 新建的 condition 為 `{ id: crypto.randomUUID(), dimensionId, op: dim.ops[0], value: undefined }`（value 未設，視為 pass-through 直到使用者填值）
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
  id: string           // crypto.randomUUID() — 跨整個 chain 唯一
  dimensionId: string
  op: Operator
  value: any           // 依 op：string | string[] | {min,max} | {from,to} | undefined（pass-through）
  attrName?: string    // Attribute 維度的第一段值
}

type ChainItem =
  | { kind: 'single'; condition: FilterCondition }
  | { kind: 'orGroup'; id: string /* crypto.randomUUID() */; conditions: FilterCondition[] }

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

/** 兩集合交集 — 以較小集合為 base 加速 */
const intersect = <T>(a: Set<T>, b: Set<T>): Set<T> => {
  const r = new Set<T>()
  const [small, large] = a.size < b.size ? [a, b] : [b, a]
  for (const v of small) if (large.has(v)) r.add(v)
  return r
}

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

1. **Ghost 層**：`viewer.isolate(matchedDbIds)` — 非命中自動 ghost（內建副作用）
2. **顏色層**：對每個命中 dbId 呼叫 `viewer.setThemingColor(id, COLOR_HIT, viewer.model)`

註：`viewer.isolate(...)` 沿用本專案現有的呼叫風格（不顯式傳 model 引數，預設操作 default model）。

### 顏色常數（首版固定）

```ts
const COLOR_HIT = new THREE.Vector4(1.0, 0.55, 0.0, 0.9)  // 暖橘
```

### ExternalId → DbId 對照快取

- 每個 model 物件 cache 一份（`WeakMap<model, Record<extId, dbId>>`）
- 切 view（同 model 換 SVF view）會載新 model 物件 → WeakMap 自然找不到舊 key → cache 自動失效（無需手動清）
- 取得失敗時 mapping 為 `{}`，命中數為 0 但不上色不報錯

```ts
// useViewerHighlight 內共用：跨 instance 也可以共用同一個 WeakMap，因為 key 是 model 物件
const mappingCache = new WeakMap<object, Record<string, number>>()

async function getMapping(viewer: any): Promise<Record<string, number>> {
  const model = viewer?.model
  if (!model) return {}
  const cached = mappingCache.get(model)
  if (cached) return cached
  const map = await new Promise<Record<string, number>>(resolve => {
    model.getExternalIdMapping(
      (m: Record<string, number>) => resolve(m),
      () => resolve({})
    )
  })
  mappingCache.set(model, map)
  return map
}
```

### 套用流程

useViewerHighlight 是 **factory composable**，每次呼叫產生獨立的 closure state（避免跨頁/跨 viewer 共用模組層變數的污染）：

```ts
export function useViewerHighlight(): UseViewerHighlight {
  let lastHitDbIds: number[] = []        // closure state，instance 獨立

  async function applyHighlight(
    viewer: any,
    externalIds: Set<string>,
    opts: { emptyMode?: 'showAll' | 'hideAll' } = {}
  ) {
    const emptyMode = opts.emptyMode ?? 'showAll'
    const map = await getMapping(viewer)
    const dbIds = [...externalIds].map(e => map[e]).filter(n => typeof n === 'number')
    viewer.clearThemingColors(viewer.model)
    if (dbIds.length === 0) {
      if (emptyMode === 'hideAll') viewer.hideAll?.()
      else viewer.isolate([])
      lastHitDbIds = []
      return { hitDbIds: [], missing: externalIds.size }
    }
    viewer.showAll?.()             // 防止上一輪 hideAll 殘留
    viewer.isolate(dbIds)
    for (const id of dbIds) viewer.setThemingColor(id, COLOR_HIT, viewer.model)
    lastHitDbIds = dbIds
    return { hitDbIds: dbIds, missing: externalIds.size - dbIds.length }
  }

  function clearHighlight(viewer: any) {
    viewer.clearThemingColors(viewer.model)
    viewer.showAll?.()
    viewer.isolate([])
    lastHitDbIds = []
  }

  async function fitToHighlight(viewer: any) {
    if (lastHitDbIds.length === 0) return
    viewer.fitToView(lastHitDbIds)
  }

  function resetForNewModel() {
    lastHitDbIds = []
  }

  return { applyHighlight, clearHighlight, fitToHighlight, resetForNewModel }
}
```

**呼叫端決策**：`useCobieFilter` 在 `result.active && finalSet.size === 0` 時用 `emptyMode: 'hideAll'`；其餘狀況用 `'showAll'`（預設）。

### 與既有功能的互動

採用「**讓路為主、自我關閉為輔**」兩段策略：

1. **讓路（預設）**：viewer 頁的 `focusElements()` 內檢查 `filter.shouldSuppressIsolate.value`
   - 為 true（篩選啟用且有命中）：只做 `select + fitToView`，**不** 呼叫 `isolate`，篩選 ghost 層保留
   - 為 false（篩選未啟用 / 無命中）：照舊 isolate + select + fitToView
2. **自我關閉（防護網）**：若未來新增其他會踩 isolate 的互動（鍵盤、3D 直接點選等），由該入口呼叫 `useCobieFilter.notifyManualFocus()` 顯式關閉篩選並 toast「篩選暫停 — 因手動選取了元件」
   - 用顯式呼叫而非監聽 viewer 事件，避免「自己呼叫的 isolate 也觸發自我關閉」的悖論
   - 目前實作中 `focusElements()` 走「讓路」分支不需呼叫 `notifyManualFocus`

切 view（同 model 換 SVF view）→ mapping 自然失效、`watch(viewer)` 內呼叫 `resetForNewModel()` 並 trigger 重套
切離 viewer 頁 → unmount 清除 highlight

### useViewerHighlight 對外介面

```ts
export interface UseViewerHighlight {
  applyHighlight(
    viewer: any,
    externalIds: Set<string>,
    opts?: { emptyMode?: 'showAll' | 'hideAll' }
  ): Promise<{ hitDbIds: number[]; missing: number }>
  clearHighlight(viewer: any): void
  /** 對最近一次 applyHighlight 的命中集合 fitToView。沒有命中或 viewer 未 ready 時 no-op。 */
  fitToHighlight(viewer: any): Promise<void>
  /** view 切換時呼叫：丟掉舊 lastHitDbIds（舊 dbIds 對新 model 物件無效） */
  resetForNewModel(): void
}
```

`lastHitDbIds` 為**每個 useViewerHighlight() instance 的 closure state**，由 `applyHighlight` 寫入、`clearHighlight` 與 `resetForNewModel` 清空。「Fit to view」按鈕直接呼叫 `fitToHighlight`。

### 生命週期

| 事件 | 動作 |
|---|---|
| 條件變更 | debounce 200ms 重算並套 highlight |
| `enabled = false` | clearHighlight，保留 chain |
| view 切換 | `resetForNewModel()` 清 `lastHitDbIds` → 重新跑 applyHighlight（mapping cache 因 model 物件變了自然失效） |
| 離開頁面 | clearHighlight |

### 邊界處理

| 情況 | 行為 |
|---|---|
| externalId 在 model 中找不到 dbId | 計入 `missing`，UI 標示 |
| viewer 尚未 ready | defer 到 `onViewerReady` |
| 命中 > 5000 件 | 不做特殊處理；觀察實測再決定是否 batch |
| 條件鏈執行中又有變更 | 用 `requestId` token，過期結果丟棄（見下） |
| `active && finalSet.size === 0`（有條件但無命中） | 整模型 ghost（`viewer.hideAll()` 或 isolate 空）— 與 UI 紅色提示視覺一致 |

**requestId 機制**（位於 `useCobieFilter`，不污染純函式引擎）：

- 用「inline debounce + token」確保中途變更時舊結果被丟棄
- 不引入新依賴（本專案無 vueuse / lodash）

```ts
let requestId = 0
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const trigger = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(run, 200)
}

const run = async () => {
  const my = ++requestId
  const c = ctx.value
  const v = viewer.value
  if (!c || !v) { result.value = { active: false }; return }

  const r = evaluateChain(chain.value, c)
  if (my !== requestId) return

  if (!r.active || !enabled.value) {
    clearHighlight(v)
    result.value = { active: false }
    return
  }

  const emptyMode = r.finalSet.size === 0 ? 'hideAll' : 'showAll'
  const { missing } = await applyHighlight(v, r.finalSet, { emptyMode })
  if (my !== requestId) return
  result.value = { ...r, missingInModel: missing }
}

// 分開 watch：chain 需要 deep（巢狀 ChainItem），其他單值 watch
// ⚠️ 切忌 deep-watch viewer ref — Forge viewer 含 THREE.Scene 循環引用，會炸。
watch(chain, trigger, { deep: true })
watch(enabled, trigger)
watch(ctx, trigger)
watch(viewer, (v, oldV) => {
  // view 切換（不同 model 物件）→ 重置 highlight 的 lastHitDbIds，再重套
  if (oldV && v !== oldV) resetForNewModel()
  trigger()
}, { immediate: true })
```

### useCobieFilter 構造簽名

```ts
// 本專案無 vueuse，自行宣告 type alias（避免額外依賴）
type MaybeRef<T> = T | Ref<T>

export function useCobieFilter(opts: {
  modelId: MaybeRef<string>
  viewer: Ref<any | null>            // Forge viewer 實例，未 ready 時 null
}): UseCobieFilterReturn

interface UseCobieFilterReturn {
  chain: Ref<FilterChain>
  /** ctx 共享給 panel 用 — panel 呼 dim.loadOptions(ctx) 取 dropdown 候選值 */
  ctx: ComputedRef<FilterCtx | null>
  /** panel 取「+ 加入條件」dropdown 內的所有可選維度 */
  availableDimensions: readonly FilterDimension[]
  result: Ref<EvaluateResultWithMissing>
  enabled: Ref<boolean>
  /** UI 給 viewer/[id].vue 用：若為 true，既有 focusElements() 應跳過 isolate */
  shouldSuppressIsolate: ComputedRef<boolean>

  // -- mutations，回傳新建項目 id 給 UI 用於 focus / 滾動定位 --
  /** 加單一條件，返回新 condition.id */
  addCondition(dimensionId: string): string
  /** 加 OR 群組，預先帶第一個 sub-condition（避免空群組狀態），返回 groupId */
  addOrGroup(firstDimensionId: string): string
  /** 加 sub-condition 到既有 OR 群組，返回新 condition.id */
  addConditionToGroup(groupId: string, dimensionId: string): string
  /** 移除整個 item（single condition 或 OR 群組） */
  removeItem(itemId: string): void
  /**
   * 從 OR 群組移除某 sub-condition；副作用：
   *   - 移除後群組剩 0 個 → 自動移除整個 OR 群組
   *   - 移除後群組剩 1 個 → 自動降階為 single ChainItem 包該唯一 condition
   */
  removeConditionFromGroup(groupId: string, conditionId: string): void
  updateCondition(conditionId: string, patch: Partial<FilterCondition>): void
  clearAll(): void
  notifyManualFocus(): void
  /** 回傳命中 externalIds 換行串接的純文字；UI 點按鈕後應自行 `navigator.clipboard.writeText(...)` 並 toast「已複製 N 個 ExtIDs」 */
  exportExtIds(): string
  /** 「Fit to view」按鈕綁這個（內部呼 useViewerHighlight.fitToHighlight） */
  fitToHits(): void
  /**
   * 結果摘要分群（依 Type.Name），UI 直接 render。empty 集合或 inactive 回 []。
   * 排序：群組依 components.length 降冪、群組內 components 依 name 字母升冪
   */
  hitsGroupedByType: ComputedRef<Array<{
    typeName: string
    typeCategory?: string
    components: ExtractedComponent[]
  }>>
}

```

```ts
// shouldSuppressIsolate — 用 if 顯式 narrow 避免 TS union 抱怨
const shouldSuppressIsolate = computed(() => {
  if (!enabled.value) return false
  const r = result.value
  return r.active && r.finalSet.size > 0
})
```

**內部結構提醒**（給實作者）：
- useCobieFilter 內部 `const highlight = useViewerHighlight()` 取得自家 instance（不要全域共用）
- watcher 內呼叫 `highlight.applyHighlight / clearHighlight / resetForNewModel`
- `fitToHits()` 委派為 `() => highlight.fitToHighlight(viewer.value)`
- `addCondition / addOrGroup / addConditionToGroup` 內部從 `REGISTRY[dimensionId].ops[0]` 取預設 op（不依賴 ctx 因為 ctx 可能還未 ready）
- `availableDimensions` 直接 `= Object.values(REGISTRY)`（filterRegistry export 的常數陣列），與 ctx 無關
- **生命週期清理**：useCobieFilter 內 `onScopeDispose(() => { if (viewer.value) highlight.clearHighlight(viewer.value); if (debounceTimer) clearTimeout(debounceTimer) })` — 避免離開頁面 / HMR 時 highlight 殘留與 timer 洩漏

### ctx 的反應性

`useFilterCtx` 提供：

```ts
export function useFilterCtx(modelId: MaybeRef<string>): {
  ctx: Ref<FilterCtx | null>
  loading: Ref<boolean>
  reload: () => Promise<void>
}
```

- **模型現況**：`useCobieStore` 是 Dexie 包裝，只暴露 `listX(modelId)` 非同步查詢，**store 本身不是 reactive 來源**
- 因此 `useFilterCtx` 採「一次性載入 + 手動 reload」：
  1. 在 composable setup 時 await 載入所有相關資料、build ctx、寫入 `ctx.value`
  2. `watch(() => unref(modelId), reload, { immediate: true })` 讓 modelId 變化自動觸發
  3. 若使用者於別處重新匯入 XLSX → 呼叫 `reload()` 手動觸發（viewer 頁本身極少觸發匯入，多數情況一次載入即夠）
- `ctx.value` 為 `null` 時 useCobieFilter 不呼叫引擎（trigger run 內已守）
- **`ctx.dim` 注入**：build ctx 時 `filterRegistry` export 一個 `REGISTRY: Record<string, FilterDimension>`，`useFilterCtx` 在組裝 ctx 時注入：
  ```ts
  const dim = (id: string) => {
    const d = REGISTRY[id]
    if (!d) throw new Error(`Unknown dimension: ${id}`)
    return d
  }
  ```
  讓 filterEngine 與 dimension 設定解耦（測試時可注入 mock REGISTRY）

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

**`viewer/[id].vue` 需要的小重構**（現有 code 用 `window.__viewer` 的全域 hack）：
- 把 viewer 實例改存進 `const viewerRef = ref<any | null>(null)`
- `onViewerReady` 內 `viewerRef.value = v`（同時保留 window 全域為向後相容）
- 把 viewerRef 傳給 `useCobieFilter({ modelId, viewer: viewerRef })`
- 既有 `focusElements()`：開頭加 `if (filter.shouldSuppressIsolate.value) { v.select(dbIds); v.fitToView(dbIds); return }` 提早走「讓路」分支

### 模組邊界

| 模組 | 職責 | 禁止 |
|---|---|---|
| `filterRegistry` | 維度宣告，純資料 + 純函式 | 接 Vue、操作 viewer |
| `filterEngine` | evaluate 邏輯，純函式 | 接 Vue、操作 viewer、查 store |
| `useFilterCtx` | 從 store 組 ctx + 索引 | 操作 viewer |
| `useViewerHighlight` | mapping cache、apply/clear | 知道 chain 結構 |
| `useCobieFilter` | facade：串 chain ↔ ctx ↔ viewer | 直接寫 UI 樣式 |
| `CobieFilterPanel` | UI root | 算邏輯 |
| `CobieFilterStatusBar` | rail 收起時顯示 `篩選 N / M 件 [清除]`，只在 `enabled && result.active` 時 render；放置在 `viewer/[id].vue` 的 `.canvas-area` 內絕對定位於頂部 | 算邏輯、操作 viewer |
| `FilterConditionCard` / `FilterOrGroupCard` | 純呈現 | 查 store |
| `FilterValueInput` | 依 op 切換輸入控件 | 知道 viewer |

依賴圖（無循環）：

```
viewer/[id].vue
  ├─ CobieFilterPanel ──┐
  └─ CobieFilterStatusBar ──┐    (兩者共用同一個 useCobieFilter instance)
                            ▼
                       useCobieFilter ────── useViewerHighlight ──── (Forge API)
                            ├─ useFilterCtx ─── useCobieStore
                            └─ filterEngine ─── filterRegistry
```

`viewer/[id].vue` 內：`const filter = useCobieFilter({ modelId, viewer: viewerRef })`，把同一個 `filter` props 傳給 `CobieFilterPanel` 與 `CobieFilterStatusBar`。

### `EvaluateResultWithMissing` 型別

```ts
type EvaluateResultWithMissing =
  | { active: false }
  | {
      active: true
      finalSet: Set<string>
      perStep: Array<{ itemId: string; count: number }>
      emptyAtStep?: number
      missingInModel: number
    }
```

（`useCobieFilter.result` 與構造簽名於 §3 內已定義，避免重複）

### 測試

**Vitest 單元測試**：

1. `filterEngine.test.ts`：mock ctx，驗 AND 鏈、OR 群組、自動展開、空集合短路、perStep 累計
2. `filterRegistry.test.ts`：各維度的 evaluate 對齊預期；重點 Attribute 擴散
3. `useFilterCtx.test.ts`：用**手寫 inline fixture**（不依賴 xlsx parser）構造少量 components / types / spaces / floors / zones / systems / attributes，驗各索引 (`bySpace / byFloor / byZone / bySystem / byType / attributesIndex`) 對齊預期。fixture 涵蓋兩跳關聯（Zone → Space → Component）與單獨 component 無關聯的 case。

**手動驗收**：
- 案例 1：`Type.Name = "Supply Diffuser 600 Face"`（sample 中存在的 Type.Name 字面值）→ 同 `Type.Category` 的所有元件全部上色
- 案例 2：上面加 `Floor.Name = "First Floor"` → 縮到一樓
- 案例 3：加 OR 群組「Manufacturer = Trane」OR「Manufacturer = Carrier」→ 群組內為兩廠商 union；再與案例 1 的 Type 條件取交集
- 案例 4：清除全部 → 模型還原（無 ghost、無 theming color）
- 案例 5（讓路）：篩選啟用且有命中時，點 COBie tab 的 mdi-cube-scan focus 一個構件 → 篩選保持啟用、ghost 與上色保留、目標構件被 select + 視角 fit 過去（不被 isolate 推翻）
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
- **條件 reorder（拖曳排序）**：順序只影響「第一個 active item 是否觸發 Type.Category 展開」，其他位置交集結果相同；若需要把不同 item 設為起點，使用者刪掉再加即可
- **OR 群組嵌套**：見 §1 互動細節已排除
