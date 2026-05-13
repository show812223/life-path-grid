# 模型檢視器 - 起手式（Nuxt 4 + Tauri 2）

## 結構

```
test/
├── app/                    Nuxt 4 srcDir
│   ├── app.vue
│   ├── pages/
│   │   ├── index.vue       模型清單
│   │   └── viewer/[id].vue Viewer 頁（多視角下拉 + 屬性面板按鈕）
│   ├── components/
│   │   ├── ForgeViewer.client.vue  Autodesk Viewer 載入 + 選取事件
│   │   └── PropertyPanel.vue       右側屬性抽屜
│   └── composables/
│       └── useManifest.ts  模型清單狀態
├── server/api/
│   └── manifest.get.ts     讀 public/data/manifest.json
├── public/data/
│   ├── manifest.json       模型清單（未來圖說也在這宣告）
│   └── models/
│       ├── single → ../../../0     (symlink，SVF1 單視角)
│       └── revit  → ../../../ver2  (symlink，Revit 多視角)
├── src-tauri/              Tauri 2 桌面殼
│   ├── tauri.conf.json
│   └── Cargo.toml
├── nuxt.config.ts          future.compatibilityVersion: 4
└── package.json
```

## 開發

```bash
pnpm install
pnpm dev    # http://localhost:3000 (或 3001 若被佔用)
```

> **Lock 卡住處理**：若顯示 `Another Nuxt dev is already running`，執行 `rm -f .nuxt/dev.lock && pnpm dev`。

## 靜態 build（給 Tauri / USB）

```bash
pnpm build  # 產出在 .output/public/，含 public/data 內容
```

預覽：
```bash
npx serve -s .output/public -p 4173
```

## Tauri 桌面 App

需 Rust + Cargo（Homebrew：`brew install rust`，或 rustup）。已驗證 `cargo check` 通過。

### 本機開發

```bash
pnpm tauri:dev   # 自動跑 pnpm dev + 開原生視窗
```

### 本機打包（只能打當前 OS 的安裝檔）

```bash
pnpm tauri:build
# Mac → src-tauri/target/release/bundle/dmg/*.dmg
# Win → src-tauri/target/release/bundle/msi/*.msi
```

### Mac + Windows 同時打包（GitHub Actions）

已設好 `.github/workflows/build.yml`，支援三種 target：
- macOS arm64（Apple Silicon）
- macOS x64（Intel）
- Windows x64

**觸發方式**：
1. **推 tag**：`git tag v0.1.0 && git push --tags` → 自動 build 並建立 GitHub Release
2. **手動**：GitHub repo → Actions → "Build Desktop App" → Run workflow

Build 完成後到 Actions 頁面下載 artifact，或 release 頁面直接抓 `.dmg` / `.msi`。

**前置**：
- repo 推上 GitHub
- 確認 `pnpm-lock.yaml` 進版控（CI 用 `--frozen-lockfile`）
- 若要做 Mac codesign / notarize，再加 Apple Developer 憑證到 repo secrets（不做也能跑，但 Mac 使用者要手動允許執行）

## 客戶交付 USB 結構

```
USB/
├── 模型檢視器.exe / .app    (打包後的 binary)
└── data/                    可由客戶替換的模型 + 圖說
    ├── manifest.json
    └── models/
```

目前 `public/data` 是 build-in 的；若要做成「**.exe 旁的 data 資料夾可替換**」，後續要把 manifest 讀取改成走 Tauri filesystem API 讀 .exe 同層目錄。

## 已實作功能

- ✅ 模型清單頁，自動從 manifest 列卡片
- ✅ 多視角下拉切換（Revit 多 view 支援）
- ✅ 模型載入（單一 SVF1 + Revit 多視角共用 SDB）
- ✅ 構件點選 → 右側屬性面板（分類 + 搜尋）
- ✅ Tauri 2 殼設定完成

## 未來擴充

`manifest.json` 已預留結構，加圖說：

```jsonc
{
  "models": [...],
  "drawings": [
    { "id": "A-1", "name": "一樓平面圖", "file": "drawings/A-1.pdf", "linkedModel": "revit" }
  ]
}
```

- 加 `pages/drawing/[id].vue` + `<PdfViewer>`（用 `pdfjs-dist`）
- 在 ForgeViewer 的 select 事件回呼裡，根據 dbId 找對應 drawing，提示「查看圖說」

## 已知注意事項

1. Forge Viewer JS 目前走 CDN（`nuxt.config.ts` 內 `head.script`），完全離線版需要下載到 `public/viewer/` 並改路徑
2. 路徑含空格或 `{ }` 字元：ForgeViewer 元件用字串拼接而非 `new URL()` 避免雙重編碼
3. 模型 viewer 必須跑在 http://（dev / build serve / Tauri webview），雙擊 file:// 無法載入
