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
