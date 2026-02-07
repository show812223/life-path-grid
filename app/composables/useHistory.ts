import type { HistoryRecord, BirthDate, ZodiacSign } from '~/shared/types'

const STORAGE_KEY = 'life-path-history'
const MAX_RECORDS = 20

export function useHistory() {
  const records = ref<HistoryRecord[]>([])

  function load() {
    if (import.meta.server) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        records.value = JSON.parse(raw)
      }
    }
    catch {
      records.value = []
    }
  }

  function save() {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
  }

  function addRecord(birthDate: BirthDate, zodiacSign: ZodiacSign, lifePathNumber: number, label?: string) {
    // 檢查是否已存在相同生日
    const existing = records.value.find(
      r => r.birthDate.year === birthDate.year && r.birthDate.month === birthDate.month && r.birthDate.day === birthDate.day
    )

    if (existing) {
      existing.timestamp = Date.now()
      existing.lifePathNumber = lifePathNumber
      if (label) existing.label = label
    }
    else {
      records.value.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        birthDate,
        zodiacSign,
        lifePathNumber,
        timestamp: Date.now(),
        label
      })
    }

    // 限制紀錄數量
    if (records.value.length > MAX_RECORDS) {
      records.value = records.value.slice(0, MAX_RECORDS)
    }

    // 按時間排序
    records.value.sort((a, b) => b.timestamp - a.timestamp)

    save()
  }

  function removeRecord(id: string) {
    records.value = records.value.filter(r => r.id !== id)
    save()
  }

  function clearAll() {
    records.value = []
    save()
  }

  // 初始化載入
  load()

  return {
    records: readonly(records),
    addRecord,
    removeRecord,
    clearAll
  }
}
