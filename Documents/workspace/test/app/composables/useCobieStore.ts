import type { CobieRepo } from './cobieTypes'
import { createSqliteRepo } from './cobieRepoSqlite'

const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let _repo: CobieRepo | null = null
const getRepo = (): CobieRepo => {
  if (_repo) return _repo
  if (!isTauri()) {
    throw new Error(
      'COBie 資料層僅在 Tauri 桌面環境可用，請改用 `pnpm tauri:dev` 啟動。'
    )
  }
  _repo = createSqliteRepo()
  return _repo
}

export const useCobieStore = () => getRepo()
