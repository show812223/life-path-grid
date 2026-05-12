import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCobieFilter } from '~/composables/useCobieFilter'
import type { CobieIndex } from '~/composables/useModelCobieIndex'

function makeIndex(): CobieIndex {
  return {
    byExtId: new Map([
      ['A', { floor: '1F', space: 'Lobby', typeName: 'Duct', system: 'HVAC', dbId: 10, name: 'Duct-A' }],
      ['B', { floor: '1F', space: 'Lobby', typeName: 'Pipe', system: 'Plumbing', dbId: 20, name: 'Pipe-B' }],
      ['C', { floor: '2F', space: 'Office', typeName: 'Duct', system: 'HVAC', dbId: 30, name: 'Duct-C' }]
    ]),
    byFloor: new Map([
      ['1F', new Set(['A', 'B'])],
      ['2F', new Set(['C'])]
    ]),
    bySpace: new Map([
      ['Lobby', new Set(['A', 'B'])],
      ['Office', new Set(['C'])]
    ]),
    byType: new Map([
      ['Duct', new Set(['A', 'C'])],
      ['Pipe', new Set(['B'])]
    ]),
    bySystem: new Map([
      ['HVAC', new Set(['A', 'C'])],
      ['Plumbing', new Set(['B'])]
    ])
  }
}

function makeMockViewer() {
  const calls: any[] = []
  return {
    calls,
    showAll: () => calls.push(['showAll']),
    hideAll: () => calls.push(['hideAll']),
    isolate: (ids: number[]) => calls.push(['isolate', [...ids]]),
    select: (ids: number[]) => calls.push(['select', [...ids]]),
    fitToView: (ids: number[]) => calls.push(['fitToView', [...ids]]),
    model: {} // truthy but unused in these tests
  }
}

describe('useCobieFilter — state machine', () => {
  let viewer: ReturnType<typeof makeMockViewer>
  let viewerRef: ReturnType<typeof ref>
  let filter: ReturnType<typeof useCobieFilter>

  beforeEach(() => {
    viewer = makeMockViewer()
    viewerRef = ref(viewer as any)
    filter = useCobieFilter({ viewer: viewerRef, injectedIndex: makeIndex() })
  })

  it('starts with null mode and empty selections', () => {
    expect(filter.pendingMode.value).toBeNull()
    expect(filter.appliedMode.value).toBeNull()
    expect(filter.pendingSelected.value.size).toBe(0)
    expect(filter.appliedSelected.value.size).toBe(0)
    expect(filter.isDirty.value).toBe(false)
  })

  it('setPendingMode changes pendingMode and clears pendingSelected', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    expect(filter.pendingSelected.value.has('1F')).toBe(true)
    filter.setPendingMode('type')
    expect(filter.pendingMode.value).toBe('type')
    expect(filter.pendingSelected.value.size).toBe(0)
  })

  it('togglePending adds and removes values', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.togglePending('2F')
    expect([...filter.pendingSelected.value].sort()).toEqual(['1F', '2F'])
    filter.togglePending('1F')
    expect([...filter.pendingSelected.value]).toEqual(['2F'])
  })

  it('selectAllPending picks every option of current mode', () => {
    filter.setPendingMode('floor')
    filter.selectAllPending()
    expect([...filter.pendingSelected.value].sort()).toEqual(['1F', '2F'])
  })

  it('clearPendingSelection empties pending but keeps mode', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.clearPendingSelection()
    expect(filter.pendingMode.value).toBe('floor')
    expect(filter.pendingSelected.value.size).toBe(0)
  })

  it('apply copies pending into applied', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    expect(filter.appliedMode.value).toBe('floor')
    expect([...filter.appliedSelected.value]).toEqual(['1F'])
    expect(filter.isDirty.value).toBe(false)
  })

  it('clear resets both pending and applied to null', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    filter.clear()
    expect(filter.pendingMode.value).toBeNull()
    expect(filter.appliedMode.value).toBeNull()
    expect(filter.pendingSelected.value.size).toBe(0)
    expect(filter.appliedSelected.value.size).toBe(0)
  })

  it('isDirty reflects pending vs applied differences', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    expect(filter.isDirty.value).toBe(true)
    filter.apply()
    expect(filter.isDirty.value).toBe(false)
    filter.togglePending('2F')
    expect(filter.isDirty.value).toBe(true)
  })
})

describe('useCobieFilter — derived hits', () => {
  let viewer: ReturnType<typeof makeMockViewer>
  let viewerRef: ReturnType<typeof ref>
  let filter: ReturnType<typeof useCobieFilter>

  beforeEach(() => {
    viewer = makeMockViewer()
    viewerRef = ref(viewer as any)
    filter = useCobieFilter({ viewer: viewerRef, injectedIndex: makeIndex() })
  })

  it('pendingOptions lists sorted values for current mode', () => {
    filter.setPendingMode('floor')
    expect(filter.pendingOptions.value).toEqual(['1F', '2F'])
    filter.setPendingMode('type')
    expect(filter.pendingOptions.value).toEqual(['Duct', 'Pipe'])
  })

  it('hitExtIds is empty when no applied filter', () => {
    expect(filter.hitExtIds.value.size).toBe(0)
  })

  it('hitExtIds is union of selected values', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.togglePending('2F')
    filter.apply()
    expect([...filter.hitExtIds.value].sort()).toEqual(['A', 'B', 'C'])
  })

  it('hitsAsList sorts by name and includes typeName', () => {
    filter.setPendingMode('type')
    filter.togglePending('Duct')
    filter.apply()
    expect(filter.hitsAsList.value).toEqual([
      { extId: 'A', dbId: 10, name: 'Duct-A', typeName: 'Duct' },
      { extId: 'C', dbId: 30, name: 'Duct-C', typeName: 'Duct' }
    ])
  })

  it('canApply requires dirty + non-empty pending + non-null mode', () => {
    expect(filter.canApply.value).toBe(false)
    filter.setPendingMode('floor')
    expect(filter.canApply.value).toBe(false) // empty selection
    filter.togglePending('1F')
    expect(filter.canApply.value).toBe(true)
    filter.apply()
    expect(filter.canApply.value).toBe(false) // not dirty
  })

  it('focusOne calls viewer.select + fitToView with the dbId', () => {
    filter.focusOne('B')
    expect(viewer.calls).toEqual([['select', [20]], ['fitToView', [20]]])
  })

  it('focusOne is a no-op for unknown extId', () => {
    filter.focusOne('UNKNOWN')
    expect(viewer.calls).toEqual([])
  })
})

describe('useCobieFilter — viewer isolation sync', () => {
  let viewer: ReturnType<typeof makeMockViewer>
  let viewerRef: ReturnType<typeof ref>
  let filter: ReturnType<typeof useCobieFilter>

  beforeEach(() => {
    viewer = makeMockViewer()
    viewerRef = ref(viewer as any)
    filter = useCobieFilter({ viewer: viewerRef, injectedIndex: makeIndex() })
  })

  it('does nothing while appliedMode is null', async () => {
    await nextTick()
    expect(viewer.calls).toEqual([])
  })

  it('isolates hit dbIds after apply() and fits view', async () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    await nextTick()
    const last = viewer.calls.slice(-3)
    expect(last[0]).toEqual(['showAll'])
    expect(last[1][0]).toBe('isolate')
    expect([...last[1][1]].sort()).toEqual([10, 20])
    expect(last[2][0]).toBe('fitToView')
    expect([...last[2][1]].sort()).toEqual([10, 20])
  })

  it('hideAll when applied filter produces zero hits', async () => {
    filter.setPendingMode('floor')
    filter.togglePending('UNKNOWN_FLOOR')
    filter.apply()
    await nextTick()
    expect(viewer.calls.at(-1)).toEqual(['hideAll'])
  })

  it('restores all on clear()', async () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    await nextTick()
    viewer.calls.length = 0
    filter.clear()
    await nextTick()
    expect(viewer.calls).toEqual([['showAll'], ['isolate', []]])
  })
})
