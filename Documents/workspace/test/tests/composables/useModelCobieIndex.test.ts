import { describe, it, expect } from 'vitest'
import { scanModel, type CobieIndex } from '~/composables/useModelCobieIndex'

function makeMockModel(elements: Array<{
  dbId: number
  externalId: string
  name: string
  floor?: string
  space?: string
  typeName?: string
  system?: string
}>) {
  const dbIds = elements.map(e => e.dbId)
  return {
    getInstanceTree: () => ({
      getRootId: () => 1,
      enumNodeChildren: (id: number, cb: (child: number) => void) => {
        if (id === 1) for (const dbId of dbIds) cb(dbId)
      }
    }),
    getBulkProperties2: (
      _ids: number[],
      _opts: any,
      cb: (results: any[]) => void
    ) => {
      cb(elements.map(e => ({
        dbId: e.dbId,
        externalId: e.externalId,
        name: e.name,
        properties: [
          e.floor != null && { displayName: 'COBie.Floor.Name', displayValue: e.floor },
          e.space != null && { displayName: 'COBie.Component.Space', displayValue: e.space },
          e.typeName != null && { displayName: 'COBie.Type.Name', displayValue: e.typeName },
          e.system != null && { displayName: 'COBie.System.Name', displayValue: e.system }
        ].filter(Boolean)
      })))
    }
  }
}

describe('scanModel', () => {
  it('builds byExtId with floor/space/type/system fields', async () => {
    const model = makeMockModel([
      { dbId: 10, externalId: 'A', name: 'Duct-1', floor: '1F', space: 'Lobby', typeName: 'Round Duct', system: 'HVAC' },
      { dbId: 20, externalId: 'B', name: 'Pipe-1', floor: '2F', typeName: 'Pipe' }
    ])
    const idx: CobieIndex = await scanModel(model)
    expect(idx.byExtId.size).toBe(2)
    expect(idx.byExtId.get('A')).toEqual({
      floor: '1F', space: 'Lobby', typeName: 'Round Duct', system: 'HVAC',
      dbId: 10, name: 'Duct-1'
    })
    expect(idx.byExtId.get('B')?.floor).toBe('2F')
    expect(idx.byExtId.get('B')?.space).toBeUndefined()
  })

  it('builds reverse indices keyed by value', async () => {
    const model = makeMockModel([
      { dbId: 1, externalId: 'A', name: 'a', floor: '1F', typeName: 'Pipe' },
      { dbId: 2, externalId: 'B', name: 'b', floor: '1F', typeName: 'Duct' },
      { dbId: 3, externalId: 'C', name: 'c', floor: '2F', typeName: 'Pipe' }
    ])
    const idx = await scanModel(model)
    expect([...idx.byFloor.get('1F') ?? []].sort()).toEqual(['A', 'B'])
    expect([...idx.byFloor.get('2F') ?? []].sort()).toEqual(['C'])
    expect([...idx.byType.get('Pipe') ?? []].sort()).toEqual(['A', 'C'])
    expect([...idx.byType.get('Duct') ?? []].sort()).toEqual(['B'])
  })

  it('skips elements without any COBie field', async () => {
    const model = makeMockModel([
      { dbId: 1, externalId: 'A', name: 'a' },
      { dbId: 2, externalId: 'B', name: 'b', floor: '1F' }
    ])
    const idx = await scanModel(model)
    expect(idx.byExtId.has('A')).toBe(false)
    expect(idx.byExtId.has('B')).toBe(true)
  })

  it('treats empty-string value as missing', async () => {
    const model = makeMockModel([
      { dbId: 1, externalId: 'A', name: 'a', floor: '', typeName: 'X' }
    ])
    const idx = await scanModel(model)
    expect(idx.byExtId.get('A')?.floor).toBeUndefined()
    expect(idx.byExtId.get('A')?.typeName).toBe('X')
  })

  it('returns empty index when model lacks instance tree', async () => {
    const model = { getInstanceTree: () => null }
    const idx = await scanModel(model)
    expect(idx.byExtId.size).toBe(0)
    expect(idx.byFloor.size).toBe(0)
  })
})
