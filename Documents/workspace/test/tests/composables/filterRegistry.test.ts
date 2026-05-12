import { describe, it, expect } from 'vitest'
import { REGISTRY, getDim } from '~/composables/filterRegistry'
import type { FilterCtx } from '~/composables/filterTypes'

const makeCtx = (overrides: Partial<FilterCtx> = {}): FilterCtx => ({
  modelId: 'M', components: [], byExternalId: new Map(),
  types: new Map(), spaces: new Map(), floors: new Map(),
  zones: [], systems: [], attributesIndex: new Map(),
  bySpace: new Map(), byFloor: new Map(), byZone: new Map(),
  bySystem: new Map(), byType: new Map(),
  dim: getDim,
  ...overrides
})

const sample = () => {
  const types = new Map([
    ['T1', { modelId: 'M', name: 'T1', category: 'cat-A', manufacturer: 'Trane', modelNumber: 'M-100', assetType: 'Fixed' } as any],
    ['T2', { modelId: 'M', name: 'T2', category: 'cat-A', manufacturer: 'Carrier', modelNumber: 'M-200', assetType: 'Moveable' } as any],
    ['T3', { modelId: 'M', name: 'T3', category: 'cat-B', manufacturer: 'Trane', assetType: 'Fixed' } as any]
  ])
  const byType = new Map([
    ['T1', new Set(['e1', 'e2'])],
    ['T2', new Set(['e3'])],
    ['T3', new Set(['e4'])]
  ])
  return makeCtx({ types, byType })
}

describe('REGISTRY type.name', () => {
  it('eq returns components of that type', () => {
    const ctx = sample()
    expect([...REGISTRY['type.name'].evaluate(ctx, 'eq', 'T1')].sort()).toEqual(['e1', 'e2'])
  })
  it('in returns union', () => {
    const ctx = sample()
    expect([...REGISTRY['type.name'].evaluate(ctx, 'in', ['T1', 'T3'])].sort()).toEqual(['e1', 'e2', 'e4'])
  })
  it('expandsTypeCategory flag is true', () => {
    expect(REGISTRY['type.name'].expandsTypeCategory).toBe(true)
  })
})

describe('REGISTRY type.category', () => {
  it('eq returns components of types in that category', () => {
    const ctx = sample()
    expect([...REGISTRY['type.category'].evaluate(ctx, 'eq', 'cat-A')].sort()).toEqual(['e1', 'e2', 'e3'])
  })
})

describe('REGISTRY type.manufacturer', () => {
  it('eq matches manufacturer', () => {
    const ctx = sample()
    expect([...REGISTRY['type.manufacturer'].evaluate(ctx, 'eq', 'Trane')].sort()).toEqual(['e1', 'e2', 'e4'])
  })
  it('contains is case-insensitive substring', () => {
    const ctx = sample()
    expect([...REGISTRY['type.manufacturer'].evaluate(ctx, 'contains', 'car')].sort()).toEqual(['e3'])
  })
})

describe('REGISTRY type.modelNumber / assetType', () => {
  it('modelNumber eq', () => {
    const ctx = sample()
    expect([...REGISTRY['type.modelNumber'].evaluate(ctx, 'eq', 'M-100')].sort()).toEqual(['e1', 'e2'])
  })
  it('assetType eq', () => {
    const ctx = sample()
    expect([...REGISTRY['type.assetType'].evaluate(ctx, 'eq', 'Fixed')].sort()).toEqual(['e1', 'e2', 'e4'])
  })
})

describe('getDim', () => {
  it('throws on unknown id', () => {
    expect(() => getDim('nope')).toThrow(/Unknown dimension/)
  })
})

const sampleComponents = () => {
  const comps = [
    { modelId: 'M', externalId: 'e1', dbId: 0, name: 'AHU-01', typeName: 'T1', tagNumber: 'TAG-01', serialNumber: 'SN-01', assetIdentifier: 'A001', barCode: 'BC1', area: 12, length: 100, installationDate: '2020-01-01', warrantyStartDate: '2020-02-01' },
    { modelId: 'M', externalId: 'e2', dbId: 0, name: 'AHU-02', typeName: 'T1', tagNumber: 'TAG-02', area: 25, length: 200, installationDate: '2021-06-01' },
    { modelId: 'M', externalId: 'e3', dbId: 0, name: 'VAV-01', typeName: 'T2', area: 5 }
  ] as any
  return makeCtx({
    components: comps,
    byExternalId: new Map(comps.map((c: any) => [c.externalId, c]))
  })
}

describe('REGISTRY component dimensions', () => {
  it('component.name contains', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.name'].evaluate(ctx, 'contains', 'AHU')].sort()).toEqual(['e1', 'e2'])
  })
  it('component.tagNumber eq', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.tagNumber'].evaluate(ctx, 'eq', 'TAG-01')]).toEqual(['e1'])
  })
  it('component.area range', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.area'].evaluate(ctx, 'range', { min: 10, max: 20 })]).toEqual(['e1'])
    expect([...REGISTRY['component.area'].evaluate(ctx, 'range', { min: 10 })].sort()).toEqual(['e1', 'e2'])
    expect([...REGISTRY['component.area'].evaluate(ctx, 'range', { max: 10 })]).toEqual(['e3'])
  })
  it('component.installationDate dateRange', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.installationDate'].evaluate(ctx, 'dateRange', { from: '2020-06-01' })]).toEqual(['e2'])
  })
})

describe('REGISTRY space / floor / zone / system', () => {
  const ctx = makeCtx({
    bySpace: new Map([['1AC1', new Set(['e1', 'e2'])], ['1AC2', new Set(['e3'])]]),
    byFloor: new Map([['1F', new Set(['e1', 'e2', 'e3'])], ['2F', new Set(['e4'])]]),
    byZone: new Map([['Admin', new Set(['e1'])]]),
    bySystem: new Map([['HVAC', new Set(['e2', 'e3'])]]),
    spaces: new Map([
      ['1AC1', { modelId: 'M', name: '1AC1', category: 'Waiting' } as any],
      ['1AC2', { modelId: 'M', name: '1AC2', category: 'Office' } as any]
    ]),
    zones: [
      { modelId: 'M', name: 'Admin', category: 'Occupancy', spaceNames: [] } as any
    ],
    systems: [
      { modelId: 'M', name: 'HVAC', category: 'Air', componentExternalIds: [] } as any
    ]
  })
  it('space.name eq', () => {
    expect([...REGISTRY['space.name'].evaluate(ctx, 'eq', '1AC1')].sort()).toEqual(['e1', 'e2'])
  })
  it('space.category eq', () => {
    expect([...REGISTRY['space.category'].evaluate(ctx, 'eq', 'Waiting')].sort()).toEqual(['e1', 'e2'])
  })
  it('floor.name eq', () => {
    expect([...REGISTRY['floor.name'].evaluate(ctx, 'eq', '1F')].sort()).toEqual(['e1', 'e2', 'e3'])
  })
  it('zone.name eq', () => {
    expect([...REGISTRY['zone.name'].evaluate(ctx, 'eq', 'Admin')]).toEqual(['e1'])
  })
  it('zone.category eq', () => {
    expect([...REGISTRY['zone.category'].evaluate(ctx, 'eq', 'Occupancy')]).toEqual(['e1'])
  })
  it('system.name eq', () => {
    expect([...REGISTRY['system.name'].evaluate(ctx, 'eq', 'HVAC')].sort()).toEqual(['e2', 'e3'])
  })
  it('system.category eq', () => {
    expect([...REGISTRY['system.category'].evaluate(ctx, 'eq', 'Air')].sort()).toEqual(['e2', 'e3'])
  })
})

describe('REGISTRY attr', () => {
  const sampleAttr = () => {
    const comps = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'AHU-01', typeName: 'T1' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'AHU-02', typeName: 'T1' },
      { modelId: 'M', externalId: 'e3', dbId: 0, name: 'VAV-01', typeName: 'T2', space: 'Room-A' }
    ] as any
    const byType = new Map([['T1', new Set(['e1', 'e2'])], ['T2', new Set(['e3'])]])
    const bySpace = new Map([['Room-A', new Set(['e3'])]])
    const attributesIndex = new Map<string, any[]>([
      ['type::t1', [{ modelId: 'M', name: 'PaintColor', value: 'White', sheetName: 'Type', rowName: 'T1' }]],
      ['component::ahu-02', [{ modelId: 'M', name: 'PaintColor', value: 'Blue', sheetName: 'Component', rowName: 'AHU-02' }]],
      ['space::room-a', [{ modelId: 'M', name: 'PaintColor', value: 'Green', sheetName: 'Space', rowName: 'Room-A' }]]
    ])
    return makeCtx({
      components: comps,
      byExternalId: new Map(comps.map((c: any) => [c.externalId, c])),
      byType, bySpace, attributesIndex
    })
  }

  it('attr eq matches Type-level attribute and spreads to all components of that type', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'eq', { attrName: 'PaintColor', value: 'White' })
    expect([...r].sort()).toEqual(['e1', 'e2'])
  })
  it('attr eq matches Component-level attribute', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'eq', { attrName: 'PaintColor', value: 'Blue' })
    expect([...r]).toEqual(['e2'])
  })
  it('attr eq matches Space-level attribute', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'eq', { attrName: 'PaintColor', value: 'Green' })
    expect([...r]).toEqual(['e3'])
  })
  it('attr contains is case-insensitive substring on value', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'contains', { attrName: 'PaintColor', value: 'whi' })
    expect([...r].sort()).toEqual(['e1', 'e2'])
  })
})
