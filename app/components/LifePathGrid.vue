<script setup lang="ts">
import type { GridData, Connection } from '~/shared/types'

interface Props {
  gridData: GridData
  connections: Connection[]
}

const props = defineProps<Props>()

// 洛書九宮格排列（從上到下，從左到右）
// 3 | 6 | 9
// 2 | 5 | 8
// 1 | 4 | 7
const gridOrder = [3, 6, 9, 2, 5, 8, 1, 4, 7]

// 取得活躍的連線
const activeConnections = computed(() => {
  return props.connections.filter((c) => c.isActive)
})

// 連線座標映射（基於九宮格位置，0-indexed）
// 格子位置：
//   0(3) | 1(6) | 2(9)
//   3(2) | 4(5) | 5(8)
//   6(1) | 7(4) | 8(7)
const numberToPosition: Record<number, { x: number; y: number }> = {
  3: { x: 0, y: 0 },
  6: { x: 1, y: 0 },
  9: { x: 2, y: 0 },
  2: { x: 0, y: 1 },
  5: { x: 1, y: 1 },
  8: { x: 2, y: 1 },
  1: { x: 0, y: 2 },
  4: { x: 1, y: 2 },
  7: { x: 2, y: 2 }
}

// 計算連線的 SVG 路徑
function getConnectionPath(connection: Connection): string {
  const [n1, n2, n3] = connection.numbers
  const p1 = numberToPosition[n1]
  const p2 = numberToPosition[n2]
  const p3 = numberToPosition[n3]

  // 計算百分比座標（格子中心）
  const toPercent = (pos: { x: number; y: number }) => ({
    x: (pos.x + 0.5) * (100 / 3),
    y: (pos.y + 0.5) * (100 / 3)
  })

  const c1 = toPercent(p1)
  const c2 = toPercent(p2)
  const c3 = toPercent(p3)

  return `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y} L ${c3.x} ${c3.y}`
}
</script>

<template>
  <div class="life-path-grid">
    <div class="grid-wrapper">
      <div class="grid-container">
        <GridCell
          v-for="num in gridOrder"
          :key="num"
          :number="num"
          :count="gridData[num]?.count || 0"
          :sources="gridData[num]?.sources || { innate: 0, lifePath: 0, talent: 0, zodiac: 0 }"
        />
      </div>
      <!-- 連線覆蓋層 -->
      <svg class="connection-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          v-for="conn in activeConnections"
          :key="conn.id"
          :d="getConnectionPath(conn)"
          class="connection-line"
          :data-type="conn.type"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.life-path-grid {
  @apply flex justify-center items-center p-4;
}

.grid-wrapper {
  @apply relative w-full max-w-xs;
}

.grid-container {
  @apply grid grid-cols-3 gap-2 aspect-square;
}

.connection-overlay {
  @apply absolute top-0 left-0 w-full h-full pointer-events-none z-10;
}

.connection-line {
  stroke: #D4A5A5;
  stroke-width: 0.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  filter: drop-shadow(0 0 4px rgba(212, 165, 165, 0.6));
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
  animation: drawLine 1s ease-out forwards;
}

.connection-line[data-type='diagonal'] {
  stroke: #C5B4E3;
  filter: drop-shadow(0 0 4px rgba(197, 180, 227, 0.6));
}

@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}

@media (max-width: 600px) {
  .grid-wrapper {
    @apply max-w-[280px];
  }
}
</style>
