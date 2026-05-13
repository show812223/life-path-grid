# 設備檔案上傳設計（COBie Document 對齊）

日期：2026-05-13
分支建議：`feature/equipment-document-upload`（單一 PR）

---

## 目標

讓使用者能在 viewer 中針對設備（Component）上傳相關檔案（規格書、保固、操作手冊、竣工圖等），且：

1. 儲存結構完全對齊 COBie Document sheet，匯出 xlsx 不破壞 COBie 結構
2. 匯入 COBie zip / xlsx 可雙向往返（round-trip）
3. 桌面端離線可用，檔案放本地檔案系統，DB 只存 metadata

---

## Phase 0：COBie 領域型別命名重構（先做、獨立 PR）

### 動機

`cobieTypes.ts` 中所有 `Extracted*` 前綴語意誤導（暗示「從來源抽出」），且即將加入「使用者上傳」這條來源，前綴與事實不符。改為 `Cobie*` 前綴，後綴與 COBie sheet 名 1:1 對齊，且避開 Vue `Component` / DOM `Document` / TS `Type` 等命名衝突。

### 對應表

| 舊名 | 新名 | 對應 COBie sheet |
|---|---|---|
| `ExtractedComponent` | `CobieComponent` | Component |
| `ExtractedType` | `CobieType` | Type |
| `ExtractedSpace` | `CobieSpace` | Space |
| `ExtractedFloor` | `CobieFloor` | Floor |
| `ExtractedSystem` | `CobieSystem` | System |
| `ExtractedZone` | `CobieZone` | Zone |
| `ExtractedFacility` | `CobieFacility` | Facility |
| `ExtractedDocument` | `CobieDocument` | Document |
| `ExtractedContact` | `CobieContact` | Contact |
| `ExtractedAttribute` | `CobieAttribute` | Attribute |
| `ExtractedSheetRow` | `CobieSheetRow` | （內部，無 sheet 對應） |
| `ExtractMeta` | `CobieMeta` | （內部） |

### 影響範圍

`app/composables/cobieTypes.ts`、`cobieRepoSqlite.ts`、`importCobieXlsx.ts`、`useCobieStore.ts`、`useModelCobieIndex.ts`、`useCobieFilter.ts`、`app/pages/cobie.vue`、`app/pages/viewer/[id].vue`、`app/components/CobieInspectionPanel.vue`、`CobieFilterPanel.vue`、`CobieFilterStatusBar.vue` 等。

### 驗收

- IDE rename symbol 一次到位、無遺漏
- `pnpm typecheck` 通過
- 現有 `vitest` 全綠
- diff 純粹是 identifier rename，無邏輯變動

---

## Phase 1：CobieDocument 欄位擴充

### 現況問題

目前 `CobieDocument`（原 `ExtractedDocument`）只存三欄：`modelId / name / raw(JSON)`，COBie Document 標準欄位都悶在 `raw` 裡，無法查詢，也沒接到 UI。

### 擴充後型別

```ts
export interface CobieDocument {
  id?: number
  modelId: string

  // COBie 標準欄位（展平，會 round-trip 進出 xlsx Document sheet）
  name?: string            // Name（在 modelId 內唯一）
  sheetName?: string       // SheetName: 'Component' | 'Type' | 'Space' | 'Floor' | 'System' | 'Zone' | 'Facility'
  rowName?: string         // RowName: 對應 sheet 內的 Name
  file?: string            // File: 原始檔名 e.g. "pump-A-spec.pdf"
  directory?: string       // Directory: 相對路徑 e.g. "docs/<sha256>.pdf" 或外部 URL
  category?: string        // Category: 分類
  stage?: string           // Stage: 階段
  createdBy?: string       // CreatedBy: email
  createdOn?: string       // CreatedOn: ISO datetime
  approvalBy?: string      // ApprovalBy
  reference?: string       // Reference
  description?: string     // Description

  // 內部欄位（不寫入 xlsx）
  storageKey?: string      // 對應檔案系統的 <sha256>.<ext>；null = 檔案缺失
  sizeBytes?: number
  mimeType?: string
  source?: 'xlsx' | 'upload'

  raw?: Record<string, any>  // 保留 round-trip 用，匯出時以展平欄位為主，raw 補未涵蓋欄位
}
```

### SQLite 結構變更

`documents` 表新增欄位（展平 + 內部欄位）。Migration：
- 新欄位 nullable，舊資料保留
- 啟動時若偵測舊欄位不足 → 從 `raw` 解析回填 `sheetName / rowName / file / directory / category / stage / createdBy / createdOn / description`，`source` 一律標 `'xlsx'`

加索引：`(modelId, sheetName, rowName)` 加速 UI 查詢「這個設備的所有文件」。

### 匯入 xlsx 的調整

`importCobieXlsx.ts` 讀 Document sheet 時，除了塞 `raw`，把標準欄位展平到對應欄位，`source = 'xlsx'`，`storageKey = null`（純 xlsx 匯入沒有實體檔案，UI 顯示「檔案缺失」）。

---

## Phase 2：本地檔案儲存（Tauri 端）

### 儲存位置

```
<appDataDir>/cobie-docs/<modelId>/<sha256>.<ext>
```

以 sha256 為檔名：
- 避開檔名衝突
- 多筆 CobieDocument 可共用同一物理檔案（檔案 dedup）
- 刪除文件時：先檢查是否還有其他 row 引用同一 storageKey，無人引用才實際刪檔

### Tauri commands

```rust
upload_document(
  modelId: string,
  bytes: Vec<u8>,
  originalFilename: string,
  mimeType: string
) -> { storageKey, sizeBytes, sha256 }

read_document(modelId: string, storageKey: string) -> Vec<u8>

delete_document_file(modelId: string, storageKey: string) -> ()
  // 僅刪實體檔，SQLite row 由前端透過 repo 刪
```

前端先計算 hash？不必，Rust 端算更快、且檔案內容不用過 JS bridge 兩次。

### 副檔名白名單

`pdf, png, jpg, jpeg, gif, webp, dwg, dxf, docx, xlsx, txt, csv, md`。Rust 端在寫檔前驗證；超出白名單拒絕並回錯。檔案大小上限 100 MB（可後續調）。

---

## Phase 3：UI（CobieInspectionPanel 內嵌）

### 觸發點

`CobieInspectionPanel.vue` 在當前選中 Component 的詳情區塊新增「文件 (n)」segment：

```
┌── 設備：Pump-A ──────────────────┐
│ Type: ...                        │
│ Space: ...                       │
│ ...                              │
│                                  │
│ 文件 (2)                  [上傳] │
│ ┌─────────────────────────────┐ │
│ │ 📄 spec-2024.pdf            │ │
│ │    規格書 · 2.4 MB · 5/12   │ │
│ │              [↓] [⟳] [×]    │ │
│ │ 📄 warranty.pdf             │ │
│ │    保固 · 0.8 MB · 5/13     │ │
│ └─────────────────────────────┘ │
└──────────────────────────────────┘
```

### 上傳流程

1. 點「上傳」或拖檔到列表區
2. 跳出小表單：
   - **檔案**（已選）
   - **Name**：預設 = 檔名去副檔名，可改（重複時提示）
   - **Category**：下拉 + 自由輸入；預設清單：規格書 / 保固 / 操作手冊 / 竣工圖 / 檢驗報告 / 其他
   - **Stage**：下拉；預設：Operation
   - **Description**：選填多行
3. 確認 → 呼叫 Tauri `upload_document` → 拿到 `storageKey` → 寫入 SQLite documents（`sheetName='Component'`, `rowName=<當前 component.name>`, `source='upload'`, `createdOn=now`, `createdBy=<從 app 設定取，先空著>`）
4. 列表立即更新（reactive query）

### 列表互動

- 點檔案列：開預覽（PDF / 圖片用 Tauri webview，其他下載）
- `[↓]` 下載：呼叫 `read_document` → save dialog
- `[⟳]` 取代：選新檔上傳、保留 metadata、舊 storageKey 若無人引用則刪實體檔
- `[×]` 刪除：確認後刪 SQLite row，若無人引用 storageKey 則刪實體檔

### 缺檔狀態（`storageKey = null`）

匯入純 xlsx 時 documents 沒有實體檔，列表顯示為灰色 + 「檔案缺失」chip + `[上傳檔案]` 按鈕讓使用者補檔（補檔時 Name/Category 維持不變，只填 storageKey/sizeBytes/mimeType/file）。

---

## Phase 4：匯出 / 匯入打包

### 匯出 zip

新增匯出按鈕「匯出 COBie zip」：

```
<facility>.cobie.zip
├── cobie.xlsx          # 完整 COBie xlsx，Document sheet 含所有 documents
└── docs/
    ├── <sha256>.pdf    # storageKey 對應的實體檔
    └── ...
```

Document sheet 每列的 `Directory` 寫 `docs/`、`File` 寫原始檔名（不是 sha256）。`storageKey = null` 的列照樣輸出，但 zip 不含實體檔（COBie 規範允許）。

純 xlsx 匯出選項保留：Document 列照樣有，但沒有 zip 包裝。

### 匯入 zip

偵測 .zip：解壓 → 解析 xlsx → 對每筆 Document，依 `Directory + File` 找對應實體檔 → copy 進 `<appDataDir>/cobie-docs/<modelId>/`、算 sha256 命名 → 回填 `storageKey`、`source = 'xlsx'`（雖然包含使用者上傳的，匯入後一律當作從 xlsx 來；後續若取代會自然變成 upload 來源）。

找不到實體檔的 Document 列：照樣入 DB，`storageKey = null`。

---

## 實作順序（單一 PR、依序 commit）

| 階段 | 內容 | commit 邊界 |
|---|---|---|
| Phase 0 | 命名重構 `Extracted*` → `Cobie*` | 1 commit（純 rename） |
| Phase 1 | CobieDocument 欄位擴充 + SQLite migration + 匯入解析展平 | 1–2 commits |
| Phase 2 | Tauri 檔案儲存 commands | 1 commit |
| Phase 3 | UI：上傳 / 列表 / 下載 / 刪除 / 取代 / 缺檔補檔 | 數個 commits |
| Phase 4 | zip 匯出與匯入 | 1–2 commits |

每個階段完成時跑 `pnpm typecheck` + 現有 vitest；最終一個 PR 送 review。commit 切乾淨方便逐段審查（特別是 Phase 0 rename 大但無邏輯變動）。

---

## 不在本 spec 範圍

- Type / Space / Floor / System 上傳文件（資料模型已支援，UI 後續再加）
- 多人協作 / 雲端存儲（C 方案）
- 文件版本歷史
- 縮圖預生成

---

## 驗收（整體完成）

1. 在 viewer 點任一 Component → 看到「文件」區塊
2. 拖一個 PDF 進去 → 列表顯示、檔案實際寫入 `<appDataDir>/cobie-docs/<modelId>/`
3. 匯出 zip → 解開檢查 cobie.xlsx 的 Document sheet 有對應列、`docs/` 內有檔案
4. 把 zip 改名匯入新模型 → 文件列表完整還原、可預覽 / 下載
5. 匯入只有 xlsx（無 docs/）→ 文件列表顯示「檔案缺失」、可手動補檔
6. 刪除最後一筆引用 storageKey 的 row → 實體檔被清除；還有其他 row 引用時 → 實體檔保留
