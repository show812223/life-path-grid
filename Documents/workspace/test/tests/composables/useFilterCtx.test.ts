import { describe, it, expect } from 'vitest'
import { buildFilterCtx } from '~/composables/useFilterCtx'

describe('buildFilterCtx', () => {
  it('builds byExternalId / bySpace / byType / byFloor / byZone / bySystem / attributesIndex', () => {
    const components = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'AHU-01', typeName: 'T1', space: 'Room-A' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'AHU-02', typeName: 'T1', space: 'Room-A' },
      { modelId: 'M', externalId: 'e3', dbId: 0, name: 'VAV-01', typeName: 'T2', space: 'Room-B' }
    ]
    const types = [
      { modelId: 'M', name: 'T1', category: 'cat-A' },
      { modelId: 'M', name: 'T2', category: 'cat-B' }
    ]
    const spaces = [
      { modelId: 'M', name: 'Room-A', floorName: '1F' },
      { modelId: 'M', name: 'Room-B', floorName: '1F' },
      { modelId: 'M', name: 'Room-C', floorName: '2F' }
    ]
    const floors = [{ modelId: 'M', name: '1F' }, { modelId: 'M', name: '2F' }]
    const zones = [
      { modelId: 'M', name: 'Admin', spaceNames: ['Room-A'] },
      { modelId: 'M', name: 'Util', spaceNames: ['Room-B', 'Room-C'] }
    ]
    const systems = [
      { modelId: 'M', name: 'HVAC', componentExternalIds: ['e1', 'e3'] }
    ]
    const attributes = [
      { modelId: 'M', sheetName: 'Type', rowName: 'T1', name: 'Color', value: 'White' },
      { modelId: 'M', sheetName: 'Component', rowName: 'AHU-02', name: 'Color', value: 'Blue' }
    ]
    const ctx = buildFilterCtx({
      modelId: 'M',
      components: components as any,
      types: types as any,
      spaces: spaces as any,
      floors: floors as any,
      zones: zones as any,
      systems: systems as any,
      attributes: attributes as any
    })
    expect(ctx.byExternalId.size).toBe(3)
    expect([...ctx.bySpace.get('Room-A') ?? []].sort()).toEqual(['e1', 'e2'])
    expect([...ctx.byType.get('T1') ?? []].sort()).toEqual(['e1', 'e2'])
    expect([...ctx.byFloor.get('1F') ?? []].sort()).toEqual(['e1', 'e2', 'e3'])
    expect([...ctx.byZone.get('Util') ?? []].sort()).toEqual(['e3'])
    expect([...ctx.bySystem.get('HVAC') ?? []].sort()).toEqual(['e1', 'e3'])
    expect(ctx.attributesIndex.get('type::t1')?.length).toBe(1)
    expect(ctx.attributesIndex.get('component::ahu-02')?.length).toBe(1)
    expect(ctx.dim('type.name').id).toBe('type.name')
  })
})
