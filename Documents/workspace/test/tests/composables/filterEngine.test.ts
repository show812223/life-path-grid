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
