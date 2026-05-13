import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async () => {
  const path = join(process.cwd(), 'public', 'data', 'manifest.json')
  const raw = await readFile(path, 'utf-8')
  return JSON.parse(raw)
})
