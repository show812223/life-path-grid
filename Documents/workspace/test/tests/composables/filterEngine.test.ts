import { describe, it, expect } from 'vitest'
import {
  itemKey,
  intersect,
  shouldExpand,
  isConditionActive
} from '~/composables/filterEngine'
import type { ChainItem, FilterCondition } from '~/composables/filterTypes'

describe('itemKey', () => {
  it('returns condition.id for single', () => {
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'type.name', op: 'eq', value: 'X' }
    }
    expect(itemKey(item)).toBe('c1')
  })
  it('returns group id for orGroup', () => {
    const item: ChainItem = { kind: 'orGroup', id: 'g1', conditions: [] }
    expect(itemKey(item)).toBe('g1')
  })
})

describe('intersect', () => {
  it('returns the intersection of two sets', () => {
    expect([...intersect(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))].sort())
      .toEqual(['b', 'c'])
  })
  it('returns empty when no overlap', () => {
    expect(intersect(new Set(['a']), new Set(['b'])).size).toBe(0)
  })
})

describe('shouldExpand', () => {
  it('returns true only for type.name', () => {
    expect(shouldExpand({ id: '', dimensionId: 'type.name', op: 'eq', value: 'X' })).toBe(true)
    expect(shouldExpand({ id: '', dimensionId: 'type.category', op: 'eq', value: 'X' })).toBe(false)
  })
})

describe('isConditionActive', () => {
  const base: FilterCondition = { id: '', dimensionId: 'type.name', op: 'eq', value: undefined }
  it('rejects empty values', () => {
    expect(isConditionActive({ ...base, value: undefined })).toBe(false)
    expect(isConditionActive({ ...base, value: null })).toBe(false)
    expect(isConditionActive({ ...base, value: '' })).toBe(false)
    expect(isConditionActive({ ...base, value: [] })).toBe(false)
  })
  it('rejects all-empty range', () => {
    expect(isConditionActive({ ...base, op: 'range', value: { min: '', max: undefined } })).toBe(false)
  })
  it('accepts partial range', () => {
    expect(isConditionActive({ ...base, op: 'range', value: { min: 10, max: undefined } })).toBe(true)
  })
  it('accepts strings, non-empty arrays, numbers', () => {
    expect(isConditionActive({ ...base, value: 'x' })).toBe(true)
    expect(isConditionActive({ ...base, value: ['x'] })).toBe(true)
    expect(isConditionActive({ ...base, value: 0 })).toBe(true)
  })
})

import { expandToSameCategory } from '~/composables/filterEngine'
import type { FilterCtx } from '~/composables/filterTypes'

const makeCtx = (overrides: Partial<FilterCtx> = {}): FilterCtx => ({
  modelId: 'M',
  components: [],
  byExternalId: new Map(),
  types: new Map(),
  spaces: new Map(),
  floors: new Map(),
  zones: [],
  systems: [],
  attributesIndex: new Map(),
  bySpace: new Map(),
  byFloor: new Map(),
  byZone: new Map(),
  bySystem: new Map(),
  byType: new Map(),
  dim: () => { throw new Error('not used') },
  ...overrides
})

describe('expandToSameCategory', () => {
  it('expands matched components to all components sharing the same Type.Category', () => {
    const comps = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'C1', typeName: 'T1' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'C2', typeName: 'T2' },
      { modelId: 'M', externalId: 'e3', dbId: 0, name: 'C3', typeName: 'T3' }
    ] as any
    const ctx = makeCtx({
      components: comps,
      byExternalId: new Map(comps.map((c: any) => [c.externalId, c])),
      types: new Map([
        ['T1', { modelId: 'M', name: 'T1', category: 'cat-A' } as any],
        ['T2', { modelId: 'M', name: 'T2', category: 'cat-A' } as any],
        ['T3', { modelId: 'M', name: 'T3', category: 'cat-B' } as any]
      ]),
      byType: new Map([
        ['T1', new Set(['e1'])],
        ['T2', new Set(['e2'])],
        ['T3', new Set(['e3'])]
      ])
    })
    expect([...expandToSameCategory(ctx, new Set(['e1']))].sort()).toEqual(['e1', 'e2'])
  })
})

import { evaluateItem } from '~/composables/filterEngine'
import type { FilterDimension } from '~/composables/filterTypes'

const mockDim = (id: string, sets: Record<string, string[]>): FilterDimension => ({
  id, label: id, group: 'Type', ops: ['eq'],
  expandsTypeCategory: id === 'type.name',
  loadOptions: () => Object.keys(sets),
  evaluate: (_ctx, _op, value) => new Set(sets[String(value)] ?? [])
})

describe('evaluateItem', () => {
  it('returns null for inactive single condition', () => {
    const ctx = makeCtx({ dim: () => mockDim('any', {}) })
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'any', op: 'eq', value: '' }
    }
    expect(evaluateItem(item, ctx, true)).toBeNull()
  })
  it('evaluates active single condition', () => {
    const dim = mockDim('mfg', { Trane: ['e1', 'e2'] })
    const ctx = makeCtx({ dim: () => dim })
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'mfg', op: 'eq', value: 'Trane' }
    }
    expect([...evaluateItem(item, ctx, false)!].sort()).toEqual(['e1', 'e2'])
  })
  it('returns null for orGroup with all inactive conditions', () => {
    const ctx = makeCtx({ dim: () => mockDim('mfg', {}) })
    const item: ChainItem = {
      kind: 'orGroup',
      id: 'g1',
      conditions: [
        { id: 'c1', dimensionId: 'mfg', op: 'eq', value: '' },
        { id: 'c2', dimensionId: 'mfg', op: 'eq', value: undefined }
      ]
    }
    expect(evaluateItem(item, ctx, false)).toBeNull()
  })
  it('unions orGroup sub-conditions', () => {
    const dim = mockDim('mfg', { Trane: ['e1'], Carrier: ['e2'] })
    const ctx = makeCtx({ dim: () => dim })
    const item: ChainItem = {
      kind: 'orGroup',
      id: 'g1',
      conditions: [
        { id: 'c1', dimensionId: 'mfg', op: 'eq', value: 'Trane' },
        { id: 'c2', dimensionId: 'mfg', op: 'eq', value: 'Carrier' }
      ]
    }
    expect([...evaluateItem(item, ctx, false)!].sort()).toEqual(['e1', 'e2'])
  })
  it('expands type.name only when isFirst', () => {
    const comps = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'C1', typeName: 'T1' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'C2', typeName: 'T2' }
    ] as any
    const dim = mockDim('type.name', { T1: ['e1'] })
    const ctx = makeCtx({
      components: comps,
      byExternalId: new Map(comps.map((c: any) => [c.externalId, c])),
      types: new Map([
        ['T1', { modelId: 'M', name: 'T1', category: 'cat-A' } as any],
        ['T2', { modelId: 'M', name: 'T2', category: 'cat-A' } as any]
      ]),
      byType: new Map([['T1', new Set(['e1'])], ['T2', new Set(['e2'])]]),
      dim: () => dim
    })
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'type.name', op: 'eq', value: 'T1' }
    }
    expect([...evaluateItem(item, ctx, true)!].sort()).toEqual(['e1', 'e2'])
    expect([...evaluateItem(item, ctx, false)!].sort()).toEqual(['e1'])
  })
})

import { evaluateChain } from '~/composables/filterEngine'
import type { FilterChain } from '~/composables/filterTypes'

describe('evaluateChain', () => {
  it('returns active:false for empty chain', () => {
    const ctx = makeCtx({ dim: () => mockDim('x', {}) })
    expect(evaluateChain({ items: [] }, ctx)).toEqual({ active: false })
  })
  it('returns active:false when all items are pass-through', () => {
    const ctx = makeCtx({ dim: () => mockDim('x', {}) })
    const chain: FilterChain = {
      items: [{
        kind: 'single',
        condition: { id: 'c1', dimensionId: 'x', op: 'eq', value: '' }
      }]
    }
    expect(evaluateChain(chain, ctx)).toEqual({ active: false })
  })
  it('AND-intersects two items', () => {
    const dimA = mockDim('A', { v: ['e1', 'e2', 'e3'] })
    const dimB = mockDim('B', { w: ['e2', 'e3', 'e4'] })
    const ctx = makeCtx({ dim: (id) => id === 'A' ? dimA : dimB })
    const chain: FilterChain = {
      items: [
        { kind: 'single', condition: { id: 'c1', dimensionId: 'A', op: 'eq', value: 'v' } },
        { kind: 'single', condition: { id: 'c2', dimensionId: 'B', op: 'eq', value: 'w' } }
      ]
    }
    const r = evaluateChain(chain, ctx)
    expect(r.active).toBe(true)
    if (r.active) {
      expect([...r.finalSet].sort()).toEqual(['e2', 'e3'])
      expect(r.perStep.map(p => p.count)).toEqual([3, 2])
    }
  })
  it('short-circuits on empty step', () => {
    const dimA = mockDim('A', { v: ['e1'] })
    const dimB = mockDim('B', { w: ['e9'] })
    const ctx = makeCtx({ dim: (id) => id === 'A' ? dimA : dimB })
    const chain: FilterChain = {
      items: [
        { kind: 'single', condition: { id: 'c1', dimensionId: 'A', op: 'eq', value: 'v' } },
        { kind: 'single', condition: { id: 'c2', dimensionId: 'B', op: 'eq', value: 'w' } }
      ]
    }
    const r = evaluateChain(chain, ctx)
    expect(r.active).toBe(true)
    if (r.active) {
      expect(r.finalSet.size).toBe(0)
      expect(r.emptyAtStep).toBe(1)
    }
  })
  it('treats pass-through items as "first active item" carrier', () => {
    const dimType = mockDim('type.name', { T1: ['e1'] })
    const comps = [{ modelId: 'M', externalId: 'e1', dbId: 0, name: 'C1', typeName: 'T1' }] as any
    const ctx = makeCtx({
      components: comps,
      byExternalId: new Map([['e1', comps[0]]]),
      types: new Map([['T1', { modelId: 'M', name: 'T1', category: 'cat-A' } as any]]),
      byType: new Map([['T1', new Set(['e1'])]]),
      dim: () => dimType
    })
    const chain: FilterChain = {
      items: [
        { kind: 'single', condition: { id: 'c1', dimensionId: 'type.name', op: 'eq', value: '' } },
        { kind: 'single', condition: { id: 'c2', dimensionId: 'type.name', op: 'eq', value: 'T1' } }
      ]
    }
    const r = evaluateChain(chain, ctx)
    expect(r.active).toBe(true)
    if (r.active) expect([...r.finalSet]).toEqual(['e1'])
  })
})
