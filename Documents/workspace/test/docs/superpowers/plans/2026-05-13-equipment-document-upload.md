# Equipment Document Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload files to equipment (COBie Component) from the viewer; files persist to local filesystem via Tauri, metadata aligns with COBie Document sheet, and full round-trip to/from `.cobie.zip` works.

**Architecture:** Single PR with 5 ordered phases. Phase 0 renames `Extracted*` → `Cobie*` (mechanical). Phase 1 expands `CobieDocument` schema + SQLite migration. Phase 2 adds Tauri Rust commands for blob storage at `<appData>/cobie-docs/<modelId>/<sha256>.<ext>`. Phase 3 wires UI in `CobieInspectionPanel`. Phase 4 adds zip export/import (xlsx + `docs/`).

**Tech Stack:** Vue 3 (Nuxt) + Vuetify 3, Tauri 2 + Rust, SQLite via `tauri-plugin-sql`, Vitest, `xlsx` (SheetJS), JSZip for packaging.

**Spec:** `docs/superpowers/specs/2026-05-13-equipment-document-upload-design.md`

---

## Pre-flight

- [ ] **Step 0.0: Verify clean working tree before starting**

Run: `git status --short`
Expected: only files this plan will touch are modified. If there are stale unrelated edits, stash or commit them first.

- [ ] **Step 0.1: Run existing tests baseline**

Run: `pnpm vitest run`
Expected: all current tests pass. Capture the count; it must not decrease.

Run: `pnpm typecheck` (if missing, use `pnpm exec nuxi typecheck`)
Expected: zero errors.

---

# Phase 0 — Naming Refactor: `Extracted*` → `Cobie*`

Pure rename. No logic change. Single commit.

### Task 0.1: Rename type identifiers in `cobieTypes.ts`

**Files:**
- Modify: `app/composables/cobieTypes.ts`

- [ ] **Step 1: Apply rename mapping**

Replace every occurrence with this 1:1 mapping (in `cobieTypes.ts`):

| Old | New |
|---|---|
| `ExtractedComponent` | `CobieComponent` |
| `ExtractedType` | `CobieType` |
| `ExtractedSpace` | `CobieSpace` |
| `ExtractedFloor` | `CobieFloor` |
| `ExtractedSystem` | `CobieSystem` |
| `ExtractedZone` | `CobieZone` |
| `ExtractedFacility` | `CobieFacility` |
| `ExtractedDocument` | `CobieDocument` |
| `ExtractedContact` | `CobieContact` |
| `ExtractedAttribute` | `CobieAttribute` |
| `ExtractedSheetRow` | `CobieSheetRow` |
| `ExtractMeta` | `CobieMeta` |

Leave `ReplacePayload`, `MergePayload`, `CobieRepo`, `plain` as-is. Update field references inside `ReplacePayload`/`MergePayload`/`CobieRepo` interface (`documents: CobieDocument[]`, `getMeta(): Promise<CobieMeta | undefined>`, etc.).

- [ ] **Step 2: Sweep all consumers**

Run: `git grep -l "Extracted\(Component\|Type\|Space\|Floor\|System\|Zone\|Facility\|Document\|Contact\|Attribute\|SheetRow\)\|ExtractMeta"`

Expected consumer files (update every match in each):
- `app/composables/cobieRepoSqlite.ts`
- `app/composables/importCobieXlsx.ts`
- `app/composables/useModelCobieIndex.ts`
- `app/composables/useCobieFilter.ts`
- `app/composables/useCobieStore.ts`
- `app/pages/cobie.vue`
- `app/pages/viewer/[id].vue`
- `app/components/CobieInspectionPanel.vue`
- `app/components/CobieFilterPanel.vue`
- `app/components/CobieFilterStatusBar.vue`
- `app/components/DocumentList.vue`
- `app/components/PropertyPanel.vue`
- `tests/composables/useModelCobieIndex.test.ts`
- `tests/composables/useCobieFilter.test.ts`

In each file, do a literal string replace using the mapping above (both in `import` statements and inline references). Do NOT rename SQL table names, column names, or variable names like `componentRow` / `docFromRow` — only the TypeScript type identifiers change.

- [ ] **Step 3: Verify no stale `Extracted*` left**

Run: `git grep -n "Extracted\(Component\|Type\|Space\|Floor\|System\|Zone\|Facility\|Document\|Contact\|Attribute\|SheetRow\)\|ExtractMeta"`
Expected: no output.

- [ ] **Step 4: Typecheck and test**

Run: `pnpm typecheck`
Expected: zero errors.

Run: `pnpm vitest run`
Expected: same count as baseline, all green.

- [ ] **Step 5: Commit**

```bash
git add app/ tests/
git commit -m "refactor(cobie): rename Extracted* types to Cobie* aligning with COBie sheet names"
```

---

# Phase 1 — Expand `CobieDocument` schema

### Task 1.1: Extend `CobieDocument` interface

**Files:**
- Modify: `app/composables/cobieTypes.ts`

- [ ] **Step 1: Replace `CobieDocument` interface**

Replace the existing `CobieDocument` (post-rename) with:

```ts
export type CobieDocumentSheetName =
  | 'Component'
  | 'Type'
  | 'Space'
  | 'Floor'
  | 'System'
  | 'Zone'
  | 'Facility'

export type CobieDocumentSource = 'xlsx' | 'upload'

export interface CobieDocument {
  id?: number
  modelId: string

  // COBie Document sheet standard columns (flattened from raw)
  name?: string
  sheetName?: CobieDocumentSheetName
  rowName?: string
  file?: string
  directory?: string
  category?: string
  stage?: string
  createdBy?: string
  createdOn?: string
  approvalBy?: string
  reference?: string
  description?: string

  // Internal fields (not written to xlsx)
  storageKey?: string   // <sha256>.<ext>; null = file missing
  sizeBytes?: number
  mimeType?: string
  source?: CobieDocumentSource

  raw?: Record<string, any>
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors (existing readers of `CobieDocument` only used `name`/`raw`, so widening is safe).

- [ ] **Step 3: Commit**

```bash
git add app/composables/cobieTypes.ts
git commit -m "feat(cobie): expand CobieDocument with COBie Document sheet standard columns and storage metadata"
```

### Task 1.2: SQLite migration v2 — extend `documents` table

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Append migration v2**

In `cobie_migrations()`, push a second `Migration` after v1:

```rust
Migration {
  version: 2,
  description: "extend documents table with COBie columns and storage metadata",
  sql: r#"
    ALTER TABLE documents ADD COLUMN sheetName TEXT;
    ALTER TABLE documents ADD COLUMN rowName TEXT;
    ALTER TABLE documents ADD COLUMN file TEXT;
    ALTER TABLE documents ADD COLUMN directory TEXT;
    ALTER TABLE documents ADD COLUMN category TEXT;
    ALTER TABLE documents ADD COLUMN stage TEXT;
    ALTER TABLE documents ADD COLUMN createdBy TEXT;
    ALTER TABLE documents ADD COLUMN createdOn TEXT;
    ALTER TABLE documents ADD COLUMN approvalBy TEXT;
    ALTER TABLE documents ADD COLUMN reference TEXT;
    ALTER TABLE documents ADD COLUMN description TEXT;
    ALTER TABLE documents ADD COLUMN storageKey TEXT;
    ALTER TABLE documents ADD COLUMN sizeBytes INTEGER;
    ALTER TABLE documents ADD COLUMN mimeType TEXT;
    ALTER TABLE documents ADD COLUMN source TEXT;
    CREATE INDEX IF NOT EXISTS idx_documents_target ON documents(modelId, sheetName, rowName);
    CREATE INDEX IF NOT EXISTS idx_documents_storage ON documents(modelId, storageKey);
  "#,
  kind: MigrationKind::Up,
},
```

- [ ] **Step 2: Verify Rust compiles**

Run: `cd src-tauri && cargo check && cd ..`
Expected: compiles with no errors. Warnings about unused are fine.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(db): migration v2 — extend documents table with COBie columns and storage metadata"
```

### Task 1.3: Update repo `DOC_COLS`, `docRow`, `docFromRow`

**Files:**
- Modify: `app/composables/cobieRepoSqlite.ts`

- [ ] **Step 1: Replace document marshalling**

Find the section (around lines 176–181 pre-rename, post-rename will be similar):

```ts
const DOC_COLS = ['modelId','name','raw']
const docRow = (d: CobieDocument) => [d.modelId, nv(d.name), j(d.raw)]
const docFromRow = (r: any): CobieDocument => ({
  id: r.id, modelId: r.modelId, name: r.name ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})
```

Replace with:

```ts
const DOC_COLS = [
  'modelId','name','sheetName','rowName','file','directory','category','stage',
  'createdBy','createdOn','approvalBy','reference','description',
  'storageKey','sizeBytes','mimeType','source','raw'
]
const docRow = (d: CobieDocument) => [
  d.modelId, nv(d.name), nv(d.sheetName), nv(d.rowName), nv(d.file), nv(d.directory),
  nv(d.category), nv(d.stage), nv(d.createdBy), nv(d.createdOn), nv(d.approvalBy),
  nv(d.reference), nv(d.description),
  nv(d.storageKey), nv(d.sizeBytes), nv(d.mimeType), nv(d.source), j(d.raw)
]
const docFromRow = (r: any): CobieDocument => ({
  id: r.id, modelId: r.modelId,
  name: r.name ?? undefined,
  sheetName: r.sheetName ?? undefined,
  rowName: r.rowName ?? undefined,
  file: r.file ?? undefined,
  directory: r.directory ?? undefined,
  category: r.category ?? undefined,
  stage: r.stage ?? undefined,
  createdBy: r.createdBy ?? undefined,
  createdOn: r.createdOn ?? undefined,
  approvalBy: r.approvalBy ?? undefined,
  reference: r.reference ?? undefined,
  description: r.description ?? undefined,
  storageKey: r.storageKey ?? undefined,
  sizeBytes: r.sizeBytes ?? undefined,
  mimeType: r.mimeType ?? undefined,
  source: r.source ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/composables/cobieRepoSqlite.ts
git commit -m "feat(cobie/repo): persist all CobieDocument columns to SQLite"
```

### Task 1.4: Add `CobieRepo` methods for document CRUD

**Files:**
- Modify: `app/composables/cobieTypes.ts`
- Modify: `app/composables/cobieRepoSqlite.ts`

- [ ] **Step 1: Extend `CobieRepo` interface**

In `cobieTypes.ts`, add to the `CobieRepo` interface:

```ts
listDocumentsFor(
  modelId: string,
  sheetName: CobieDocumentSheetName,
  rowName: string
): Promise<CobieDocument[]>

insertDocument(doc: CobieDocument): Promise<number>  // returns inserted id

updateDocument(id: number, patch: Partial<CobieDocument>): Promise<void>

deleteDocument(id: number): Promise<void>

countStorageKeyRefs(modelId: string, storageKey: string): Promise<number>
```

Keep existing `listDocuments(modelId?)` untouched.

- [ ] **Step 2: Implement in `createSqliteRepo`**

In `cobieRepoSqlite.ts`, add inside the returned object (before `clearModel`):

```ts
async listDocumentsFor(modelId, sheetName, rowName) {
  const db = await getDb()
  const rows = await db.select<any[]>(
    'SELECT * FROM documents WHERE modelId = ? AND sheetName = ? AND rowName = ? ORDER BY id',
    [modelId, sheetName, rowName]
  )
  return rows.map(docFromRow)
},
async insertDocument(doc) {
  const db = await getDb()
  const d = plain(doc)
  const result = await db.execute(
    `INSERT INTO documents (${DOC_COLS.map(c => `"${c}"`).join(',')}) VALUES (${DOC_COLS.map(() => '?').join(',')})`,
    docRow(d)
  )
  return result.lastInsertId ?? 0
},
async updateDocument(id, patch) {
  const db = await getDb()
  const cols = Object.keys(patch).filter(k => k !== 'id' && k !== 'modelId')
  if (!cols.length) return
  const sets = cols.map(c => `"${c}" = ?`).join(',')
  const vals = cols.map(c => {
    const v = (patch as any)[c]
    return c === 'raw' ? j(v) : nv(v)
  })
  await db.execute(`UPDATE documents SET ${sets} WHERE id = ?`, [...vals, id])
},
async deleteDocument(id) {
  const db = await getDb()
  await db.execute('DELETE FROM documents WHERE id = ?', [id])
},
async countStorageKeyRefs(modelId, storageKey) {
  const db = await getDb()
  const rows = await db.select<any[]>(
    'SELECT COUNT(*) AS c FROM documents WHERE modelId = ? AND storageKey = ?',
    [modelId, storageKey]
  )
  return rows[0]?.c ?? 0
},
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/composables/cobieTypes.ts app/composables/cobieRepoSqlite.ts
git commit -m "feat(cobie/repo): add document CRUD methods (listFor/insert/update/delete/countRefs)"
```

### Task 1.5: Update xlsx import to flatten Document columns

**Files:**
- Modify: `app/composables/importCobieXlsx.ts`
- Create: `tests/composables/importCobieXlsx.documents.test.ts`

- [ ] **Step 1: Write failing test for Document flattening**

Create `tests/composables/importCobieXlsx.documents.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseCobieXlsx } from '~/composables/importCobieXlsx'

const buildWorkbook = (rows: Record<string, any>[]) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Document')
  // minimal Facility so parser is happy
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Name: 'F1' }]), 'Facility')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseCobieXlsx — Document flattening', () => {
  it('flattens standard COBie Document columns into CobieDocument fields', async () => {
    const buf = buildWorkbook([
      {
        Name: 'spec-pump-a',
        SheetName: 'Component',
        RowName: 'Pump-A',
        File: 'spec.pdf',
        Directory: 'docs/',
        Category: '規格書',
        Stage: 'Operation',
        CreatedBy: 'u@example.com',
        CreatedOn: '2026-05-13T00:00:00Z',
        ApprovalBy: 'approver@example.com',
        Reference: 'ref-1',
        Description: 'pump spec'
      }
    ])
    const report = await parseCobieXlsx(buf, 'm1')
    expect(report.documents).toHaveLength(1)
    const d = report.documents[0]!
    expect(d).toMatchObject({
      modelId: 'm1',
      name: 'spec-pump-a',
      sheetName: 'Component',
      rowName: 'Pump-A',
      file: 'spec.pdf',
      directory: 'docs/',
      category: '規格書',
      stage: 'Operation',
      createdBy: 'u@example.com',
      createdOn: '2026-05-13T00:00:00Z',
      approvalBy: 'approver@example.com',
      reference: 'ref-1',
      description: 'pump spec',
      source: 'xlsx'
    })
    expect(d.storageKey).toBeUndefined()
    expect(d.raw).toBeDefined()
  })

  it('ignores unknown sheetName values (sets undefined)', async () => {
    const buf = buildWorkbook([{ Name: 'x', SheetName: 'Bogus', RowName: 'y' }])
    const report = await parseCobieXlsx(buf, 'm1')
    expect(report.documents[0]!.sheetName).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run tests/composables/importCobieXlsx.documents.test.ts`
Expected: FAIL — fields like `sheetName`, `file`, etc. are undefined.

- [ ] **Step 3: Update parser to flatten Document columns**

In `importCobieXlsx.ts`, locate the Documents block:

```ts
const documents: CobieDocument[] = rowsFrom(wb, 'Document')
  .filter(r => Object.keys(cloneRow(r)).length > 0)
  .map(r => ({
    modelId,
    name: str(r.Name),
    raw: cloneRow(r)
  }))
```

Replace with:

```ts
const VALID_DOC_SHEETS = new Set<CobieDocumentSheetName>([
  'Component','Type','Space','Floor','System','Zone','Facility'
])
const asDocSheetName = (v: any): CobieDocumentSheetName | undefined => {
  const s = str(v)
  return s && VALID_DOC_SHEETS.has(s as CobieDocumentSheetName)
    ? (s as CobieDocumentSheetName)
    : undefined
}

const documents: CobieDocument[] = rowsFrom(wb, 'Document')
  .filter(r => Object.keys(cloneRow(r)).length > 0)
  .map(r => ({
    modelId,
    name: str(r.Name),
    sheetName: asDocSheetName(r.SheetName),
    rowName: str(r.RowName),
    file: str(r.File),
    directory: str(r.Directory),
    category: str(r.Category),
    stage: str(r.Stage),
    createdBy: str(r.CreatedBy),
    createdOn: str(r.CreatedOn),
    approvalBy: str(r.ApprovalBy),
    reference: str(r.Reference),
    description: str(r.Description),
    source: 'xlsx' as const,
    raw: cloneRow(r)
  }))
```

Add `CobieDocumentSheetName` to the type imports at the top.

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm vitest run tests/composables/importCobieXlsx.documents.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Run full test suite**

Run: `pnpm vitest run`
Expected: all green, baseline + 2 new tests.

- [ ] **Step 6: Commit**

```bash
git add app/composables/importCobieXlsx.ts tests/composables/importCobieXlsx.documents.test.ts
git commit -m "feat(cobie/import): flatten COBie Document columns into CobieDocument fields"
```

---

# Phase 2 — Tauri commands for file storage

### Task 2.1: Add Rust dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add `sha2` and enable `fs` Tauri feature**

In `[dependencies]`:

```toml
sha2 = "0.10"
```

(No new Tauri features needed — we will use stable `tauri::Manager` + `std::fs`.)

- [ ] **Step 2: Verify build**

Run: `cd src-tauri && cargo check && cd ..`
Expected: dependencies resolve, compiles.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "build(tauri): add sha2 for document content hashing"
```

### Task 2.2: Create `documents` Rust module with commands

**Files:**
- Create: `src-tauri/src/documents.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create the module**

Create `src-tauri/src/documents.rs`:

```rust
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const ALLOWED_EXT: &[&str] = &[
    "pdf","png","jpg","jpeg","gif","webp","dwg","dxf","docx","xlsx","txt","csv","md",
];
const MAX_BYTES: usize = 100 * 1024 * 1024; // 100 MB

#[derive(Serialize)]
pub struct UploadResult {
    pub storage_key: String,
    pub sha256: String,
    pub size_bytes: u64,
}

fn docs_dir(app: &AppHandle, model_id: &str) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let safe_model = sanitize_segment(model_id);
    Ok(base.join("cobie-docs").join(safe_model))
}

fn sanitize_segment(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

fn ext_of(filename: &str) -> Option<String> {
    filename.rsplit_once('.').map(|(_, e)| e.to_ascii_lowercase())
}

#[tauri::command]
pub fn upload_document(
    app: AppHandle,
    model_id: String,
    bytes: Vec<u8>,
    original_filename: String,
) -> Result<UploadResult, String> {
    if bytes.len() > MAX_BYTES {
        return Err(format!("檔案超過上限 {} MB", MAX_BYTES / 1024 / 1024));
    }
    let ext = ext_of(&original_filename).ok_or_else(|| "缺少副檔名".to_string())?;
    if !ALLOWED_EXT.contains(&ext.as_str()) {
        return Err(format!("不允許的副檔名：{}", ext));
    }
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let sha256 = hex_lower(&hasher.finalize());
    let storage_key = format!("{}.{}", sha256, ext);

    let dir = docs_dir(&app, &model_id)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let target = dir.join(&storage_key);
    if !target.exists() {
        let mut f = fs::File::create(&target).map_err(|e| e.to_string())?;
        f.write_all(&bytes).map_err(|e| e.to_string())?;
    }
    Ok(UploadResult { storage_key, sha256, size_bytes: bytes.len() as u64 })
}

#[tauri::command]
pub fn read_document(
    app: AppHandle,
    model_id: String,
    storage_key: String,
) -> Result<Vec<u8>, String> {
    let key = sanitize_storage_key(&storage_key)?;
    let path = docs_dir(&app, &model_id)?.join(key);
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_document_file(
    app: AppHandle,
    model_id: String,
    storage_key: String,
) -> Result<(), String> {
    let key = sanitize_storage_key(&storage_key)?;
    let path = docs_dir(&app, &model_id)?.join(key);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Deserialize)]
pub struct DocFileEntry {
    pub storage_key: String,
    pub bytes: Vec<u8>,
}

#[tauri::command]
pub fn write_document_files(
    app: AppHandle,
    model_id: String,
    entries: Vec<DocFileEntry>,
) -> Result<(), String> {
    let dir = docs_dir(&app, &model_id)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    for e in entries {
        let key = sanitize_storage_key(&e.storage_key)?;
        let target = dir.join(key);
        if !target.exists() {
            let mut f = fs::File::create(&target).map_err(|err| err.to_string())?;
            f.write_all(&e.bytes).map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_document_files(
    app: AppHandle,
    model_id: String,
) -> Result<Vec<String>, String> {
    let dir = docs_dir(&app, &model_id)?;
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.file_name().to_str() {
            out.push(name.to_string());
        }
    }
    Ok(out)
}

fn sanitize_storage_key(s: &str) -> Result<String, String> {
    if s.contains('/') || s.contains('\\') || s.contains("..") {
        return Err("非法的 storage_key".to_string());
    }
    Ok(s.to_string())
}

fn hex_lower(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push(HEX[(b >> 4) as usize] as char);
        s.push(HEX[(b & 0xf) as usize] as char);
    }
    s
}
```

- [ ] **Step 2: Register module and commands in `lib.rs`**

Add at the top of `src-tauri/src/lib.rs`:

```rust
mod documents;
```

In the `tauri::Builder::default()` chain, after `.plugin(...)`, before `.setup(...)`, add:

```rust
.invoke_handler(tauri::generate_handler![
    documents::upload_document,
    documents::read_document,
    documents::delete_document_file,
    documents::write_document_files,
    documents::list_document_files,
])
```

- [ ] **Step 3: Build**

Run: `cd src-tauri && cargo check && cd ..`
Expected: compiles. If `tauri::Manager` import is unused warning, ignore.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/documents.rs src-tauri/src/lib.rs
git commit -m "feat(tauri): documents module — upload/read/delete/list/write commands with sha256 storage"
```

### Task 2.3: TypeScript wrapper for Tauri commands

**Files:**
- Create: `app/composables/documentStorage.ts`

- [ ] **Step 1: Create wrapper**

```ts
import { invoke } from '@tauri-apps/api/core'

export interface UploadResult {
  storage_key: string
  sha256: string
  size_bytes: number
}

export interface DocFileEntry {
  storage_key: string
  bytes: number[]   // Tauri serde transforms Vec<u8> ↔ number[]
}

export const uploadDocument = (
  modelId: string,
  bytes: Uint8Array,
  originalFilename: string
): Promise<UploadResult> =>
  invoke('upload_document', {
    modelId,
    bytes: Array.from(bytes),
    originalFilename
  })

export const readDocument = async (
  modelId: string,
  storageKey: string
): Promise<Uint8Array> => {
  const arr = await invoke<number[]>('read_document', { modelId, storageKey })
  return new Uint8Array(arr)
}

export const deleteDocumentFile = (
  modelId: string,
  storageKey: string
): Promise<void> =>
  invoke('delete_document_file', { modelId, storageKey })

export const writeDocumentFiles = (
  modelId: string,
  entries: DocFileEntry[]
): Promise<void> =>
  invoke('write_document_files', { modelId, entries })

export const listDocumentFiles = (modelId: string): Promise<string[]> =>
  invoke('list_document_files', { modelId })
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/composables/documentStorage.ts
git commit -m "feat(cobie/storage): typed Tauri command wrappers for document files"
```

### Task 2.4: Manual smoke test of upload roundtrip

- [ ] **Step 1: Run Tauri dev**

Run (in a separate terminal): `pnpm tauri:dev`
Expected: app launches.

- [ ] **Step 2: Use DevTools console to invoke upload**

Open the Tauri webview DevTools (right-click → inspect or `F12`). In console:

```js
const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]) // "%PDF-1.4"
const { invoke } = window.__TAURI__.core
const r = await invoke('upload_document', {
  modelId: 'smoke-test',
  bytes: Array.from(bytes),
  originalFilename: 'smoke.pdf'
})
console.log(r)
```

Expected: returns `{ storage_key: "<sha256>.pdf", sha256: "...", size_bytes: 8 }`.

- [ ] **Step 3: Verify file on disk**

On macOS: `ls -la "$HOME/Library/Application Support/com.modelviewer.app/cobie-docs/smoke-test/"`
Expected: one file named `<sha256>.pdf`, 8 bytes.

- [ ] **Step 4: Round-trip read**

In the same DevTools console:

```js
const arr = await invoke('read_document', { modelId: 'smoke-test', storageKey: r.storage_key })
console.log(arr.length, arr.slice(0, 4))
```

Expected: length 8, first 4 are `[37, 80, 68, 70]`.

- [ ] **Step 5: Test rejection (bad extension)**

```js
await invoke('upload_document', { modelId: 'smoke-test', bytes: [1,2,3], originalFilename: 'evil.exe' })
```

Expected: throws `"不允許的副檔名：exe"`.

- [ ] **Step 6: Cleanup smoke artifacts**

```js
await invoke('delete_document_file', { modelId: 'smoke-test', storageKey: r.storage_key })
```

Then remove the empty dir manually (optional) and stop the dev server.

No commit here; this is verification only.

---

# Phase 3 — UI: Document list + upload in `CobieInspectionPanel`

### Task 3.1: Composable `useComponentDocuments`

**Files:**
- Create: `app/composables/useComponentDocuments.ts`

- [ ] **Step 1: Create the composable**

```ts
import { computed, ref, watch, type Ref } from 'vue'
import { useCobieStore } from './useCobieStore'
import {
  uploadDocument,
  readDocument,
  deleteDocumentFile,
} from './documentStorage'
import type { CobieDocument, CobieDocumentSheetName } from './cobieTypes'

export interface UploadInput {
  file: File
  name: string
  category?: string
  stage?: string
  description?: string
}

export interface UseComponentDocsArgs {
  modelId: Ref<string>
  sheetName: CobieDocumentSheetName
  rowName: Ref<string | undefined>
}

export const useComponentDocuments = (args: UseComponentDocsArgs) => {
  const store = useCobieStore()
  const docs = ref<CobieDocument[]>([])
  const loading = ref(false)

  const reload = async () => {
    docs.value = []
    const rn = args.rowName.value
    if (!rn) return
    loading.value = true
    try {
      docs.value = await store.listDocumentsFor(args.modelId.value, args.sheetName, rn)
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [args.modelId.value, args.rowName.value] as const,
    reload,
    { immediate: true }
  )

  const upload = async (input: UploadInput) => {
    const rn = args.rowName.value
    if (!rn) throw new Error('沒有對應的 RowName，無法上傳')

    const bytes = new Uint8Array(await input.file.arrayBuffer())
    const r = await uploadDocument(args.modelId.value, bytes, input.file.name)

    const doc: CobieDocument = {
      modelId: args.modelId.value,
      name: input.name,
      sheetName: args.sheetName,
      rowName: rn,
      file: input.file.name,
      directory: 'docs/',
      category: input.category,
      stage: input.stage ?? 'Operation',
      createdOn: new Date().toISOString(),
      description: input.description,
      storageKey: r.storage_key,
      sizeBytes: r.size_bytes,
      mimeType: input.file.type || undefined,
      source: 'upload',
    }
    await store.insertDocument(doc)
    await reload()
  }

  const download = async (doc: CobieDocument) => {
    if (!doc.storageKey) throw new Error('檔案缺失')
    const bytes = await readDocument(doc.modelId, doc.storageKey)
    const blob = new Blob([bytes], { type: doc.mimeType || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.file || `${doc.name || 'document'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const remove = async (doc: CobieDocument) => {
    if (!doc.id) return
    await store.deleteDocument(doc.id)
    if (doc.storageKey) {
      const refs = await store.countStorageKeyRefs(doc.modelId, doc.storageKey)
      if (refs === 0) await deleteDocumentFile(doc.modelId, doc.storageKey)
    }
    await reload()
  }

  const replace = async (doc: CobieDocument, file: File) => {
    if (!doc.id) return
    const bytes = new Uint8Array(await file.arrayBuffer())
    const r = await uploadDocument(doc.modelId, bytes, file.name)
    const oldKey = doc.storageKey
    await store.updateDocument(doc.id, {
      file: file.name,
      storageKey: r.storage_key,
      sizeBytes: r.size_bytes,
      mimeType: file.type || undefined,
      source: 'upload',
      createdOn: new Date().toISOString(),
    })
    if (oldKey && oldKey !== r.storage_key) {
      const refs = await store.countStorageKeyRefs(doc.modelId, oldKey)
      if (refs === 0) await deleteDocumentFile(doc.modelId, oldKey)
    }
    await reload()
  }

  const attachFileToMissing = async (doc: CobieDocument, file: File) => {
    if (!doc.id) return
    const bytes = new Uint8Array(await file.arrayBuffer())
    const r = await uploadDocument(doc.modelId, bytes, file.name)
    await store.updateDocument(doc.id, {
      file: file.name,
      storageKey: r.storage_key,
      sizeBytes: r.size_bytes,
      mimeType: file.type || undefined,
    })
    await reload()
  }

  const empty = computed(() => !loading.value && docs.value.length === 0)

  return { docs, loading, empty, reload, upload, download, remove, replace, attachFileToMissing }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/composables/useComponentDocuments.ts
git commit -m "feat(cobie/docs): useComponentDocuments composable — list/upload/download/replace/delete"
```

### Task 3.2: Replace `DocumentList.vue` with real UI

**Files:**
- Modify: `app/components/DocumentList.vue`

- [ ] **Step 1: Rewrite component**

Replace the entire file:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SelectedElement } from './ForgeViewer.client.vue'
import { useCobieStore } from '~/composables/useCobieStore'
import { useComponentDocuments } from '~/composables/useComponentDocuments'
import type { CobieComponent, CobieDocument } from '~/composables/cobieTypes'

const props = defineProps<{
  element: SelectedElement | null
  modelId: string
}>()

const store = useCobieStore()
const component = ref<CobieComponent | undefined>()
const rowName = computed(() => component.value?.name)

const reloadComponent = async () => {
  component.value = undefined
  const extId = props.element?.externalId
  if (!extId || !props.modelId) return
  component.value = await store.getComponent(props.modelId, extId)
}
watch(() => [props.element?.externalId, props.modelId] as const, reloadComponent, { immediate: true })

const modelIdRef = computed(() => props.modelId)
const { docs, empty, loading, upload, download, remove, replace, attachFileToMissing } =
  useComponentDocuments({ modelId: modelIdRef, sheetName: 'Component', rowName })

const CATEGORIES = ['規格書','保固','操作手冊','竣工圖','檢驗報告','其他']
const STAGES = ['Design','Construction','Operation','Decommission']

const showUploadDialog = ref(false)
const pendingFile = ref<File | null>(null)
const form = ref({ name: '', category: CATEGORIES[0]!, stage: 'Operation', description: '' })

const fileInput = ref<HTMLInputElement | null>(null)
const replaceInput = ref<HTMLInputElement | null>(null)
const attachInput = ref<HTMLInputElement | null>(null)
const replaceTarget = ref<CobieDocument | null>(null)
const attachTarget = ref<CobieDocument | null>(null)

const onPickFile = () => fileInput.value?.click()
const onFileSelected = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  pendingFile.value = f
  form.value.name = f.name.replace(/\.[^.]+$/, '')
  form.value.category = CATEGORIES[0]!
  form.value.stage = 'Operation'
  form.value.description = ''
  showUploadDialog.value = true
  ;(e.target as HTMLInputElement).value = ''
}

const submitUpload = async () => {
  if (!pendingFile.value) return
  await upload({
    file: pendingFile.value,
    name: form.value.name.trim() || pendingFile.value.name,
    category: form.value.category,
    stage: form.value.stage,
    description: form.value.description || undefined,
  })
  pendingFile.value = null
  showUploadDialog.value = false
}

const onReplaceClick = (d: CobieDocument) => {
  replaceTarget.value = d
  replaceInput.value?.click()
}
const onReplaceSelected = async (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!f || !replaceTarget.value) return
  await replace(replaceTarget.value, f)
  replaceTarget.value = null
}

const onAttachClick = (d: CobieDocument) => {
  attachTarget.value = d
  attachInput.value?.click()
}
const onAttachSelected = async (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!f || !attachTarget.value) return
  await attachFileToMissing(attachTarget.value, f)
  attachTarget.value = null
}

const onDelete = async (d: CobieDocument) => {
  if (!confirm(`確定刪除「${d.name || d.file}」？`)) return
  await remove(d)
}

const formatSize = (n?: number) => {
  if (!n && n !== 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
const formatDate = (s?: string) => (s ? s.slice(0, 10) : '—')
</script>

<template>
  <div class="docs">
    <div v-if="!element" class="empty">
      <v-icon icon="mdi-cursor-default-click-outline" size="32" color="grey-lighten-1" />
      <div>在 3D 中點選元件</div>
    </div>

    <div v-else-if="!component" class="empty">
      <v-icon icon="mdi-database-off-outline" size="32" color="grey-lighten-1" />
      <div>此元件未在 COBie 資料表中</div>
    </div>

    <template v-else>
      <header class="head">
        <div class="title">文件 ({{ docs.length }})</div>
        <v-btn size="x-small" variant="tonal" prepend-icon="mdi-upload" @click="onPickFile">
          上傳
        </v-btn>
      </header>
      <input ref="fileInput" type="file" hidden @change="onFileSelected" />
      <input ref="replaceInput" type="file" hidden @change="onReplaceSelected" />
      <input ref="attachInput" type="file" hidden @change="onAttachSelected" />

      <div v-if="loading" class="empty">
        <v-progress-circular indeterminate size="20" width="2" />
      </div>

      <div v-else-if="empty" class="empty">
        <v-icon icon="mdi-file-document-outline" size="32" color="grey-lighten-1" />
        <div>尚未上傳文件</div>
      </div>

      <ul v-else class="list">
        <li v-for="d in docs" :key="d.id" class="item" :class="{ missing: !d.storageKey }">
          <v-icon
            :icon="d.storageKey ? 'mdi-file-document' : 'mdi-file-document-alert-outline'"
            size="20"
            :color="d.storageKey ? 'primary' : 'warning'"
          />
          <div class="meta">
            <div class="name">{{ d.name || d.file || '(未命名)' }}</div>
            <div class="sub">
              <v-chip v-if="d.category" size="x-small" variant="tonal">{{ d.category }}</v-chip>
              <span>{{ formatSize(d.sizeBytes) }}</span>
              <span>{{ formatDate(d.createdOn) }}</span>
              <v-chip v-if="!d.storageKey" size="x-small" color="warning" variant="tonal">
                檔案缺失
              </v-chip>
            </div>
          </div>
          <div class="actions">
            <v-btn
              v-if="d.storageKey"
              icon="mdi-download"
              size="x-small"
              variant="text"
              @click="download(d)"
            />
            <v-btn
              v-if="d.storageKey"
              icon="mdi-swap-horizontal"
              size="x-small"
              variant="text"
              @click="onReplaceClick(d)"
            />
            <v-btn
              v-else
              icon="mdi-upload"
              size="x-small"
              variant="text"
              color="warning"
              @click="onAttachClick(d)"
            />
            <v-btn icon="mdi-close" size="x-small" variant="text" @click="onDelete(d)" />
          </div>
        </li>
      </ul>

      <v-dialog v-model="showUploadDialog" max-width="420">
        <v-card>
          <v-card-title class="text-body-1">上傳文件</v-card-title>
          <v-card-text class="d-flex flex-column ga-3">
            <div class="text-caption text-medium-emphasis">
              檔案：{{ pendingFile?.name }} ({{ formatSize(pendingFile?.size) }})
            </div>
            <v-text-field v-model="form.name" label="名稱 (Name)" density="compact" hide-details />
            <v-combobox
              v-model="form.category"
              :items="CATEGORIES"
              label="分類 (Category)"
              density="compact"
              hide-details
            />
            <v-select
              v-model="form.stage"
              :items="STAGES"
              label="階段 (Stage)"
              density="compact"
              hide-details
            />
            <v-textarea
              v-model="form.description"
              label="描述 (Description)"
              rows="2"
              density="compact"
              hide-details
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showUploadDialog = false">取消</v-btn>
            <v-btn color="primary" @click="submitUpload">上傳</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<style scoped>
.docs { display: flex; flex-direction: column; height: 100%; }
.head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
}
.title { font-size: 13px; font-weight: 700; }
.empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 24px; font-size: 12px; color: var(--text-muted); text-align: center;
}
.list { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
.item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, rgba(0,0,0,0.04));
  font-size: 12px;
}
.item.missing { background: rgba(255, 152, 0, 0.04); }
.meta { flex: 1; min-width: 0; }
.name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { display: flex; gap: 6px; align-items: center; color: var(--text-muted); margin-top: 2px; }
.actions { display: flex; gap: 2px; }
</style>
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm tauri:dev`
- Open a model in the viewer
- Click an equipment that exists in COBie data
- Switch to the "docs" rail tab (the one rendering `DocumentList`)
- Click 上傳, pick a small PDF, confirm form
- Verify the item appears in the list
- Click download — file downloads
- Click ⟳ replace — pick another file, item updates
- Click × delete — confirm dialog, item removed

If `DocumentList` is not already mounted in `viewer/[id].vue` for the `docs` tab, verify in that file and wire up if missing (it's already in `railTab` enum so component should be referenced — confirm by reading `viewer/[id].vue`).

- [ ] **Step 4: Commit**

```bash
git add app/components/DocumentList.vue
git commit -m "feat(viewer): DocumentList — list/upload/download/replace/delete equipment documents"
```

### Task 3.3: Ensure `DocumentList` is mounted in viewer

**Files:**
- Verify / Modify: `app/pages/viewer/[id].vue`

- [ ] **Step 1: Read current viewer template**

Run: `git grep -n "DocumentList\|railTab.*docs\|'docs'" app/pages/viewer/`vue`

If `DocumentList` is already imported and rendered when `railTab === 'docs'`, skip to Step 3. Otherwise:

- [ ] **Step 2: Wire `DocumentList` (only if not present)**

In `app/pages/viewer/[id].vue`:

```ts
import DocumentList from '~/components/DocumentList.vue'
```

In the rail panel template where other tabs render, add (matching the existing pattern):

```vue
<DocumentList
  v-else-if="railTab === 'docs'"
  :element="selectedElement"
  :model-id="modelId"
/>
```

- [ ] **Step 3: Typecheck + smoke test in browser**

Run: `pnpm typecheck` → zero errors.

Run app, click docs tab, verify the rewritten panel renders.

- [ ] **Step 4: Commit (only if you modified the viewer)**

```bash
git add app/pages/viewer/[id].vue
git commit -m "feat(viewer): mount DocumentList under docs rail tab"
```

---

# Phase 4 — `.cobie.zip` export and import

### Task 4.1: Add JSZip dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install jszip**

Run: `pnpm add jszip`
Expected: jszip added to `dependencies`. Verify in `package.json`.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add jszip for COBie zip packaging"
```

### Task 4.2: Export helper — build `.cobie.zip`

**Files:**
- Create: `app/composables/exportCobieZip.ts`
- Create: `tests/composables/exportCobieZip.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/composables/exportCobieZip.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildCobieZip } from '~/composables/exportCobieZip'
import type { CobieDocument } from '~/composables/cobieTypes'

describe('buildCobieZip', () => {
  it('writes cobie.xlsx and docs/ with given files', async () => {
    const documents: CobieDocument[] = [
      {
        modelId: 'm1',
        name: 'spec-1',
        sheetName: 'Component',
        rowName: 'Pump-A',
        file: 'spec.pdf',
        directory: 'docs/',
        category: '規格書',
        storageKey: 'abc123.pdf',
        sizeBytes: 4,
        source: 'upload',
      },
    ]
    const blob = await buildCobieZip({
      xlsxBytes: new Uint8Array([1, 2, 3, 4]),
      documents,
      readDocFile: async (key) => {
        expect(key).toBe('abc123.pdf')
        return new Uint8Array([9, 9, 9, 9])
      },
    })
    const zip = await JSZip.loadAsync(blob)
    expect(zip.file('cobie.xlsx')).toBeTruthy()
    expect(zip.file('docs/abc123.pdf')).toBeTruthy()
    const docBytes = await zip.file('docs/abc123.pdf')!.async('uint8array')
    expect(Array.from(docBytes)).toEqual([9, 9, 9, 9])
  })

  it('skips documents whose storageKey has no file (file missing)', async () => {
    const documents: CobieDocument[] = [
      { modelId: 'm1', name: 'x', storageKey: undefined, source: 'xlsx' },
    ]
    const blob = await buildCobieZip({
      xlsxBytes: new Uint8Array([1]),
      documents,
      readDocFile: async () => {
        throw new Error('should not be called')
      },
    })
    const zip = await JSZip.loadAsync(blob)
    expect(zip.folder('docs')?.file(/./)?.length ?? 0).toBe(0)
  })

  it('dedupes storageKey — reads each unique key once', async () => {
    const documents: CobieDocument[] = [
      { modelId: 'm1', name: 'a', storageKey: 'k.pdf', source: 'upload' },
      { modelId: 'm1', name: 'b', storageKey: 'k.pdf', source: 'upload' },
    ]
    const seen: string[] = []
    await buildCobieZip({
      xlsxBytes: new Uint8Array([1]),
      documents,
      readDocFile: async (key) => {
        seen.push(key)
        return new Uint8Array([1])
      },
    })
    expect(seen).toEqual(['k.pdf'])
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run tests/composables/exportCobieZip.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `exportCobieZip.ts`**

Create `app/composables/exportCobieZip.ts`:

```ts
import JSZip from 'jszip'
import type { CobieDocument } from './cobieTypes'

export interface BuildCobieZipArgs {
  xlsxBytes: Uint8Array
  documents: CobieDocument[]
  readDocFile: (storageKey: string) => Promise<Uint8Array>
}

export const buildCobieZip = async (args: BuildCobieZipArgs): Promise<Blob> => {
  const zip = new JSZip()
  zip.file('cobie.xlsx', args.xlsxBytes)

  const docsFolder = zip.folder('docs')!
  const uniqueKeys = new Set<string>()
  for (const d of args.documents) {
    if (d.storageKey) uniqueKeys.add(d.storageKey)
  }
  for (const key of uniqueKeys) {
    try {
      const bytes = await args.readDocFile(key)
      docsFolder.file(key, bytes)
    } catch {
      // best-effort: skip missing files silently
    }
  }
  return zip.generateAsync({ type: 'blob' })
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm vitest run tests/composables/exportCobieZip.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/exportCobieZip.ts tests/composables/exportCobieZip.test.ts
git commit -m "feat(cobie/export): buildCobieZip — package xlsx + docs/ with storageKey dedup"
```

### Task 4.3: COBie xlsx generator including flattened Document rows

**Files:**
- Create: `app/composables/buildCobieXlsx.ts`
- Create: `tests/composables/buildCobieXlsx.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/composables/buildCobieXlsx.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { buildCobieXlsx } from '~/composables/buildCobieXlsx'
import type { CobieDocument } from '~/composables/cobieTypes'

describe('buildCobieXlsx — Document sheet', () => {
  it('writes flattened Document columns and uses docs/ Directory', async () => {
    const docs: CobieDocument[] = [
      {
        modelId: 'm1',
        name: 'spec-1',
        sheetName: 'Component',
        rowName: 'Pump-A',
        file: 'spec.pdf',
        directory: 'should-be-overridden',
        category: '規格書',
        stage: 'Operation',
        createdBy: 'u@example.com',
        createdOn: '2026-05-13T00:00:00Z',
        description: 'pump spec',
        storageKey: 'abc.pdf',
        source: 'upload',
      },
    ]
    const bytes = await buildCobieXlsx({ documents: docs })
    const wb = XLSX.read(bytes, { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Document']!, { defval: '' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      Name: 'spec-1',
      SheetName: 'Component',
      RowName: 'Pump-A',
      File: 'spec.pdf',
      Directory: 'docs/',
      Category: '規格書',
      Stage: 'Operation',
      CreatedBy: 'u@example.com',
      CreatedOn: '2026-05-13T00:00:00Z',
      Description: 'pump spec',
    })
  })

  it('emits empty Directory when storageKey is missing', async () => {
    const docs: CobieDocument[] = [
      { modelId: 'm1', name: 'x', sheetName: 'Component', rowName: 'A', file: 'f.pdf' },
    ]
    const bytes = await buildCobieXlsx({ documents: docs })
    const wb = XLSX.read(bytes, { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Document']!, { defval: '' })
    expect(rows[0].Directory).toBe('')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run tests/composables/buildCobieXlsx.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement minimal generator**

Create `app/composables/buildCobieXlsx.ts`:

```ts
import * as XLSX from 'xlsx'
import type { CobieDocument } from './cobieTypes'

export interface BuildXlsxArgs {
  documents: CobieDocument[]
  // Other sheets (Component/Type/...) intentionally out of scope for v1 export
  // — they round-trip via raw rows in a future task. For now we only ensure
  // the Document sheet is correct, since that's the feature this plan ships.
}

const DOC_COLUMNS = [
  'Name','CreatedBy','CreatedOn','Category','ApprovalBy','Stage',
  'SheetName','RowName','Directory','File','Description','Reference',
]

export const buildCobieXlsx = async (args: BuildXlsxArgs): Promise<Uint8Array> => {
  const wb = XLSX.utils.book_new()

  const docRows = args.documents.map(d => {
    const r: Record<string, any> = {}
    for (const col of DOC_COLUMNS) r[col] = ''
    if (d.name) r.Name = d.name
    if (d.createdBy) r.CreatedBy = d.createdBy
    if (d.createdOn) r.CreatedOn = d.createdOn
    if (d.category) r.Category = d.category
    if (d.approvalBy) r.ApprovalBy = d.approvalBy
    if (d.stage) r.Stage = d.stage
    if (d.sheetName) r.SheetName = d.sheetName
    if (d.rowName) r.RowName = d.rowName
    if (d.storageKey) r.Directory = 'docs/'
    if (d.file) r.File = d.file
    if (d.description) r.Description = d.description
    if (d.reference) r.Reference = d.reference
    return r
  })
  const ws = XLSX.utils.json_to_sheet(docRows, { header: DOC_COLUMNS })
  XLSX.utils.book_append_sheet(wb, ws, 'Document')

  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm vitest run tests/composables/buildCobieXlsx.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/buildCobieXlsx.ts tests/composables/buildCobieXlsx.test.ts
git commit -m "feat(cobie/export): buildCobieXlsx — emit Document sheet with flattened columns"
```

### Task 4.4: Wire export action in viewer

**Files:**
- Modify: `app/pages/viewer/[id].vue`

- [ ] **Step 1: Add export handler**

In `app/pages/viewer/[id].vue` script setup, add:

```ts
import { buildCobieXlsx } from '~/composables/buildCobieXlsx'
import { buildCobieZip } from '~/composables/exportCobieZip'
import { readDocument } from '~/composables/documentStorage'

const exportingZip = ref(false)
const exportCobieZip = async () => {
  exportingZip.value = true
  try {
    const documents = await store.listDocuments(modelId.value)
    const xlsxBytes = await buildCobieXlsx({ documents })
    const blob = await buildCobieZip({
      xlsxBytes,
      documents,
      readDocFile: (key) => readDocument(modelId.value, key),
    })
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = `${model.value?.name || modelId.value}.cobie.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } finally {
    exportingZip.value = false
  }
}
```

In the template, add a button somewhere visible in the toolbar/header (next to existing controls — match the file's existing pattern):

```vue
<v-btn
  size="small"
  variant="tonal"
  prepend-icon="mdi-folder-zip"
  :loading="exportingZip"
  @click="exportCobieZip"
>
  匯出 COBie zip
</v-btn>
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm tauri:dev`
- Open viewer with a model that has uploaded documents
- Click 匯出 COBie zip
- Save the .zip
- Unzip and verify `cobie.xlsx` and `docs/<sha>.<ext>` files exist
- Open xlsx in Excel/Numbers, confirm Document sheet rows

- [ ] **Step 4: Commit**

```bash
git add app/pages/viewer/[id].vue
git commit -m "feat(viewer): export COBie zip from viewer toolbar"
```

### Task 4.5: Import `.cobie.zip` — extract files and DB rows

**Files:**
- Modify: `app/composables/importCobieXlsx.ts` (or create `importCobieZip.ts` if cleaner)
- Modify: `app/pages/cobie.vue` (or wherever import is currently wired)

- [ ] **Step 1: Read current import wiring**

Run: `git grep -n "parseCobieXlsx\|replaceForModel" app/pages/ app/components/`
Note where the existing xlsx import UI lives so the zip path can sit alongside.

- [ ] **Step 2: Create `importCobieZip.ts`**

Create `app/composables/importCobieZip.ts`:

```ts
import JSZip from 'jszip'
import { parseCobieXlsx, type XlsxImportReport } from './importCobieXlsx'
import { writeDocumentFiles } from './documentStorage'
import type { CobieDocument } from './cobieTypes'

export interface ZipImportResult {
  report: XlsxImportReport
}

export const importCobieZip = async (
  file: File,
  modelId: string
): Promise<ZipImportResult> => {
  const buf = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)
  const xlsxEntry = zip.file('cobie.xlsx') ?? zip.file(/\.xlsx$/i)?.[0]
  if (!xlsxEntry) throw new Error('zip 內找不到 cobie.xlsx')
  const xlsxBytes = await xlsxEntry.async('arraybuffer')
  const report = await parseCobieXlsx(xlsxBytes, modelId)

  // For each document with Directory + File present, find the file in zip
  // (preferred path: docs/<original File>) and write to local storage.
  const entries: { storage_key: string; bytes: number[] }[] = []
  const enriched: CobieDocument[] = []
  for (const d of report.documents) {
    if (!d.file || !d.directory) {
      enriched.push(d)
      continue
    }
    const path = `${d.directory.replace(/\/?$/, '/')}${d.file}`
    const entry = zip.file(path) ?? zip.file(d.file)
    if (!entry) {
      enriched.push(d) // file missing — storageKey stays undefined
      continue
    }
    const bytes = await entry.async('uint8array')
    const ext = d.file.toLowerCase().split('.').pop() || 'bin'
    const sha = await sha256Hex(bytes)
    const storageKey = `${sha}.${ext}`
    entries.push({ storage_key: storageKey, bytes: Array.from(bytes) })
    enriched.push({
      ...d,
      storageKey,
      sizeBytes: bytes.byteLength,
      directory: 'docs/',  // canonicalize to relative
    })
  }
  report.documents = enriched

  if (entries.length) {
    await writeDocumentFiles(modelId, entries)
  }
  return { report }
}

const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  const arr = new Uint8Array(hash)
  let s = ''
  for (const b of arr) s += b.toString(16).padStart(2, '0')
  return s
}
```

- [ ] **Step 3: Wire UI to accept .zip**

In the existing COBie import UI (look in `app/pages/cobie.vue` per Step 1), detect `.zip` extension and route through `importCobieZip` instead of `parseCobieXlsx`. The result `report` has the same shape; pass it to the existing replace-for-model flow:

```ts
import { importCobieZip } from '~/composables/importCobieZip'

const handleImport = async (file: File) => {
  const isZip = /\.zip$/i.test(file.name)
  const report = isZip
    ? (await importCobieZip(file, modelId.value)).report
    : await parseCobieXlsx(file, modelId.value)
  // existing path: build ReplacePayload from report and call store.replaceForModel(...)
  // (follow the pattern already in this file)
}
```

(Use the file's existing pattern for the rest — see how `parseCobieXlsx` result currently flows to `replaceForModel`.)

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 5: Manual smoke test (round-trip)**

Run: `pnpm tauri:dev`
- Use the zip exported in Task 4.4
- In the COBie import UI, select the .zip
- Verify: document count matches, documents appear in CobieInspectionPanel docs tab, download works for each
- Try importing a zip with no `docs/` folder → documents should show with "檔案缺失" chip

- [ ] **Step 6: Commit**

```bash
git add app/composables/importCobieZip.ts app/pages/cobie.vue
git commit -m "feat(cobie/import): support .cobie.zip — restore docs/ files to local storage"
```

---

## Final verification

- [ ] **Step F.1: Full test suite**

Run: `pnpm vitest run`
Expected: all green. Total = baseline + tests added in Tasks 1.5, 4.2, 4.3.

- [ ] **Step F.2: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step F.3: Rust build**

Run: `cd src-tauri && cargo check && cd ..`
Expected: compiles.

- [ ] **Step F.4: End-to-end manual scenario**

Run: `pnpm tauri:dev`

Verify the acceptance criteria from spec §驗收:
1. Open viewer, click any Component → 文件 區塊 shows
2. Upload a PDF → list shows, file written to `<appData>/cobie-docs/<modelId>/<sha>.pdf`
3. 匯出 COBie zip → unzip; `cobie.xlsx` has correct Document row, `docs/` has the file
4. Import that zip on a fresh modelId → documents restored, downloadable
5. Import only xlsx (rename `.zip` → `.xlsx` extraction, or build a docs-less zip) → "檔案缺失" chip, attach button works
6. Two documents with same storageKey, delete one → file remains; delete the other → file gone

- [ ] **Step F.5: Open PR**

```bash
git push -u origin <branch>
gh pr create --title "feat(cobie): equipment document upload (COBie Document aligned)" --body "$(cat <<'EOF'
## Summary
- Rename `Extracted*` types to `Cobie*` aligning with COBie sheet names (Phase 0).
- Expand `CobieDocument` with COBie Document sheet standard columns + local storage metadata; SQLite migration v2.
- Tauri commands for `<appData>/cobie-docs/<modelId>/<sha256>.<ext>` storage (Phase 2).
- `DocumentList` real UI: upload / list / download / replace / delete, COBie-conformant metadata form (Phase 3).
- `.cobie.zip` round-trip: export (`cobie.xlsx` + `docs/`) and import (writes files back to local storage) (Phase 4).

Spec: `docs/superpowers/specs/2026-05-13-equipment-document-upload-design.md`

## Test plan
- [ ] `pnpm vitest run` green
- [ ] `pnpm typecheck` green
- [ ] `cd src-tauri && cargo check` green
- [ ] Upload PDF to a Component, verify file on disk
- [ ] Export zip, unzip, verify xlsx Document row + docs/ file
- [ ] Re-import zip on fresh modelId, verify all documents restored and downloadable
- [ ] Import xlsx without docs/, verify 檔案缺失 + attach flow
- [ ] Delete shared-storageKey docs, verify file lifecycle
EOF
)"
```

---

## Out of scope (reminder)

These are explicitly NOT in this plan, per spec §不在本 spec 範圍:
- Type / Space / Floor / System document UI (data model supports it; UI deferred)
- Cloud storage
- Version history
- Thumbnail generation
- PDF inline preview (download is the v1 fallback)

## Self-review notes

- All spec sections (Phase 0–4) map to tasks above.
- No placeholders: every code-modifying step has the exact code or rename mapping inline.
- Type consistency: `CobieDocument` shape defined in Task 1.1 is used identically in Tasks 1.3, 1.4, 1.5, 3.1, 3.2, 4.2, 4.3, 4.5. Field names (`storageKey`, `sheetName`, `rowName`, `file`, `directory`) are stable throughout.
- TDD applied where unit-testable: xlsx parsing (1.5), zip building (4.2), xlsx Document writing (4.3). Tauri Rust + Vue UI rely on manual smoke tests (no harness exists for Tauri commands here — explicitly documented).
- One known soft spot: Task 3.3 is contingent — verify `DocumentList` mount first, only modify viewer if missing. Step 1 explicitly checks.
