# Viewer COBie 篩選器 v2 — 砍掉重練設計規格

- 日期：2026-05-12
- 範圍：`app/pages/viewer/[id].vue`（單一模型 3D 檢視頁）
- 狀態：設計待實作
- 取代：`2026-05-12-viewer-cobie-filter-design.md`（v1 已實作但偏複雜）

## 動機

v1 篩選器已上線，但實際使用後發現：
- 22 個維度太散，使用者不知道從哪開始
- 資料源混亂（COBie store / Viewer 屬性兩套，行為不一致）
- Chain + OR 群組模型過度泛用，日常用不到
- 「先抽 COBie」前置條件造成卡關

v2 目標：**砍掉重練，回到最常用的 4 類 × 單模式 × 顯式套用**。

## 概念模型（決策摘要）

- **4 個互斥模式**：`樓層 / 空間 / 類型 / 系統`，任一時刻最多一個 active
- **active 模式內可複選**（值之間 OR）
- **顯式套用**：勾選不會立即生效；按 [篩選] 才套用到 viewer
- **只隔離不上色**：命中物件 `isolate`，其他元件隱藏（ghost），不做 setThemingColor
- **資料源純 Viewer 屬性**：開啟篩選 tab 時掃一次模型屬性快取，不依賴 COBie store / XLSX
- **手動點 viewer 不影響篩選**：使用者點 viewer 中的元件只在當前隔離集合中 select，不取消篩選

## 範圍邊界

- 單一模型：作用於當前 viewer 模型
- 不上色、不變色、不 setThemingColor
- 不依賴 COBie store；XLSX 匯入的 systems 不會出現在 chip（取捨：模型沒寫 `COBie.System.Name` 的 viewer 看不到系統選項）
- 不影響「物件詳細」、「設備文件」、「COBie 資料」等其他 tab

## §1 — UI 結構

### 1.1 篩選面板版面（`CobieFilterPanel.vue` 重寫）

```
┌─────────────────────────────────────┐
│ 篩選                   142 / 1200   │  header
├─────────────────────────────────────┤
│ [樓層·2] [空間] [類型] [系統]       │  4 個 chip
├─────────────────────────────────────┤
│ 全選 / 清空                          │
│ 🔍 搜尋…                             │
│ ☑ 1F                                 │
│ ☑ 2F                                 │
│ ☐ 3F                                 │
│ ☐ B1                                 │
├─────────────────────────────────────┤
│ [清除]                  [篩選] ●     │  apply / clear
├─────────────────────────────────────┤
│ 結果（142）                          │
│ • Round Duct-Mark 1                 │
│ • Round Duct-Mark 2                 │
│ • Lavatory-A1                       │
│ ...                                  │
└─────────────────────────────────────┘
```

### 1.2 Chip 行為

- 4 顆 chip：`樓層 / 空間 / 類型 / 系統`
- 無 active：點 → 變 active，下方顯示該類別選項
- 已 active：再點 → 取消 active；下方選項收起；不動 applied 狀態
- 點不同 chip：切換 active，下方選項換成新類別；**清空 `pendingSelected`**（保留 applied）
- 註：`appliedMode` 與當前 active chip（`pendingMode`）可以不同。例：使用者套用了「樓層=1F」後，再點 chip [類型] 想看選項，但還沒按 [篩選] — 此時 viewer 仍隔離 1F，chip 區顯示類型選項。
- chip 上顯示已 pending 選的數量（例：`樓層·2`）

### 1.3 選項區（active chip 時才顯示）

- 上方一條「全選 / 清空」捷徑
- 搜尋框（值多時實用，inline 過濾）
- v-list with checkboxes
- 排序：純字串 `localeCompare`
- 空清單（該欄位無資料）→ 顯示「無 XX 資料」灰字

### 1.4 套用列

- 兩顆按鈕：`[清除]` / `[篩選]`
- `[篩選]` 在 `isDirty && pendingSelected.size > 0 && pendingMode !== null` 時 enabled；否則 disabled
  - 含意：使用者沒勾任何值時無法套用空篩選；要清空隔離請按 [清除]
- `[篩選]` enabled 時加 primary 強調 + 圓點 indicator
- `[清除]` 永遠可點；點下把 applied + pending 都清掉

### 1.5 結果清單（applied 後顯示）

- flat list，依 `name` 字串排序
- 每列：name（主）+ typeName（副，灰字小體）
- 點一列 → `viewer.select([dbId]); viewer.fitToView([dbId])`；**不改變隔離集合**
- 空命中（pending 套了但 0 件）→ 顯示「此條件下無命中」

### 1.6 浮動狀態列（`CobieFilterStatusBar.vue` 簡化）

panel 收合時，浮在 viewer 上方：

```
🔎 樓層 · 2 已選 · 142 件   [✕]
```

- 只在 `appliedMode !== null` 時顯示
- `[✕]` = 等同 [清除] 按鈕

### 1.7 載入狀態

索引建立中（首次掃模型屬性）：
- chip 全部 disabled
- chip 區域顯示 inline spinner + 「載入索引中…」
- 結果列顯示 placeholder

## §2 — 資料層

### 2.1 新 composable：`useModelCobieIndex(viewer)`

從 Viewer 屬性建立一次索引並 cache 在 model 上：

```ts
interface CobieIndex {
  byExtId: Map<string, {
    floor?: string
    space?: string
    typeName?: string
    system?: string
    dbId: number
    name: string
  }>
  byFloor: Map<string, Set<string>>   // floor → extIds
  bySpace: Map<string, Set<string>>
  byType: Map<string, Set<string>>
  bySystem: Map<string, Set<string>>
}

interface UseModelCobieIndex {
  index: Ref<CobieIndex | null>
  loading: Ref<boolean>
  /** 強制重建（換模型或外部觸發） */
  rebuild(viewer: any): Promise<void>
}
```

### 2.2 建索引流程

1. enumerate `viewer.model` 所有 dbId（DFS instance tree）
2. `model.getBulkProperties2(dbIds, { propFilter: ['COBie.Floor.Name', 'COBie.Component.Space', 'COBie.Type.Name', 'COBie.System.Name', 'externalId'] }, cb)`
3. 對每個 result：
   - 取 `externalId`、`name`、`dbId`
   - 依 displayName 取四個欄位的 `displayValue`（空字串視為缺）
   - 寫入 `byExtId` + 四個反向 Map
4. cache 結果於 `WeakMap<model, CobieIndex>`；換模型自動失效
5. 失敗（getBulkProperties2 reject）→ `index = null`，UI 顯示錯誤

### 2.3 Floor 來源假設

採選項 A：**假設元件屬性直接有 `COBie.Floor.Name`**。若實際模型測試發現元件側缺 floor 欄位，再延伸成「掃 Space row 反查」（未進入 v2 範圍）。

### 2.4 索引重建時機

- viewer model 變化（換模型）→ 自動失效，下次取用時重建
- 不需要 manual refresh 按鈕（v2 範圍外）

## §3 — 篩選 Composable

### 3.1 新 `useCobieFilter`（取代舊檔，API 大幅縮減）

```ts
type FilterMode = 'floor' | 'space' | 'type' | 'system' | null

interface UseCobieFilterReturn {
  // pending（使用者編輯中）
  pendingMode: Ref<FilterMode>
  pendingSelected: Ref<Set<string>>

  // applied（實際套用）
  appliedMode: Ref<FilterMode>
  appliedSelected: Ref<Set<string>>

  // index
  index: Ref<CobieIndex | null>
  indexLoading: Ref<boolean>

  // derived
  isDirty: ComputedRef<boolean>
  pendingOptions: ComputedRef<string[]>
  hitExtIds: ComputedRef<Set<string>>
  hitCount: ComputedRef<number>
  totalCount: ComputedRef<number>
  hitsAsList: ComputedRef<Array<{
    extId: string
    dbId: number
    name: string
    typeName?: string
  }>>

  // actions
  setPendingMode(m: FilterMode): void
  togglePending(value: string): void
  selectAllPending(): void
  clearPendingSelection(): void
  apply(): void
  clear(): void
  focusOne(extId: string): void
}
```

### 3.2 計算邏輯

- `pendingOptions`：依 `pendingMode` 取對應反向 Map 的 keys，`localeCompare` 排序
- `hitExtIds`（從 applied 計算）：
  - `appliedMode === null` → 空 Set（無篩選態）
  - 否則取 `index.byXxx.get(v)` 對每個 selected value 取聯集
- `hitsAsList`：`hitExtIds` → 透過 `byExtId` 取 dbId + name + typeName，依 name 排序
- `isDirty`：`pendingMode !== appliedMode || pendingSelected ≠ appliedSelected`（Set 比較用 size + 逐項）

### 3.3 Viewer 同步

`watch([appliedMode, appliedSelected], applyIsolation)`：

```
applyIsolation(viewer, hitDbIds, appliedMode):
  if appliedMode === null:
    viewer.showAll(); viewer.isolate([])
  else if hitDbIds.size === 0:
    viewer.hideAll()                    // 命中為零 → 全隱藏
  else:
    viewer.showAll(); viewer.isolate(hitDbIds)
  // 完全不調用 setThemingColor / clearThemingColors
```

### 3.4 `focusOne` 行為

```
focusOne(extId):
  const dbId = index.byExtId.get(extId)?.dbId
  if !dbId: return
  viewer.select([dbId])
  viewer.fitToView([dbId])
  // 不調用 isolate；當前隔離集合保留
```

### 3.5 Lifecycle

- viewer model 變化 → 重建 index → `clear()`（避免舊狀態跨模型殘留）
- `onScopeDispose` → viewer 上 `showAll() + isolate([])`，清除影響

## §4 — 移除清單

以下檔案 / 函式 / UI 全砍：

### 4.1 檔案直接刪除

- `app/composables/filterEngine.ts`
- `app/composables/filterRegistry.ts`
- `app/composables/filterTypes.ts`
- `app/composables/useFilterCtx.ts`
- `app/composables/useViewerHighlight.ts`
- `app/components/FilterConditionCard.vue`
- `app/components/FilterOrGroupCard.vue`
- `app/components/FilterValueInput.vue`

### 4.2 檔案重寫（保留路徑、內容歸零）

- `app/composables/useCobieFilter.ts` → 新 API（§3.1）
- `app/components/CobieFilterPanel.vue` → 新 UI（§1）
- `app/components/CobieFilterStatusBar.vue` → 簡化（§1.6）

### 4.3 viewer 頁面（`app/pages/viewer/[id].vue`）需調整

- 移除 `filter.expandToSystem` / `expandToCategory` 相關引用
- 移除 `filter.shouldSuppressIsolate` 邏輯（`focusElements` 簡化）
- 移除 `filter.notifyManualFocus()`（手動點選不取消篩選）
- 移除「Type.Category 去重提取」UI（已在 v1 加入）
- 移除「同系統 / 同 Type.Category」開關（已在 v1 加入）
- `useCobieFilter` 呼叫簽名變更：不再傳 `modelId`，改傳 `viewer`

### 4.4 不動的部分

- `app/composables/useCobieStore.ts`（保留，給「COBie 資料」tab 與 xlsx 匯入用）
- `app/composables/useCobieFilter.ts` 與 `useCobieStore.ts` 解耦：篩選完全不讀 store
- 4 個 rail tab（COBie 資料 / 設備文件 / 物件詳細 / 篩選）的 tab 切換不動
- 「清除 COBie 資料」按鈕保留（屬於 store 範疇）

## §5 — 測試重點

- 索引建立：大模型（>5000 元件）首次掃時間 < 5 秒；無 COBie 欄位的物件 graceful 略過
- Chip 切換：切換時 pending 清空、applied 不變
- 顯式套用：勾選不動 viewer；按 [篩選] 才生效
- 空命中：套用後 0 件 → viewer hideAll
- 換模型：舊狀態完全清掉、新模型重建索引
- 手動點 viewer 元件：篩選保留，當前隔離集合不變
- focusOne：select + fitToView 後使用者改動 chip 再 apply 不殘留

## §6 — 取捨記錄

1. **不支援 AND 跨類別**（如「1F 樓 AND HVAC 系統」）— 簡化換來，需求出現再延伸
2. **不支援 OR 群組** — 同上
3. **System 不再讀 XLSX** — 若模型沒寫 `COBie.System.Name`，系統 chip 會空。使用者若需要走 XLSX，得用舊 COBie tab 工作流
4. **Floor 從元件直接讀**（非 Space → Floor 反查）— 簡單路徑，實測再延伸
5. **無 enable toggle** — 切換靠 chip active / [清除] 完成
6. **無 fit-to-hits / copy ext-ids / category-extraction** — 罕用，砍掉
