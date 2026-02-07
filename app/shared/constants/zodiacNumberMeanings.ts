import type { ZodiacNumberMeaning } from '~/shared/types'

export const ZODIAC_NUMBER_MEANINGS: ZodiacNumberMeaning[] = [
  {
    number: 1,
    name: '先驅思維',
    description: '星座數1代表你的思維模式偏向開創和行動。你傾向於先做再說，面對問題時會本能地尋找新的解決方案，而非遵循既有路徑。',
    traits: ['主動出擊', '獨立判斷', '行動導向', '開創思維']
  },
  {
    number: 2,
    name: '和諧思維',
    description: '星座數2代表你的思維模式偏向合作與平衡。你在做決定時會考量他人的感受，傾向以協商和溝通的方式解決問題。',
    traits: ['顧及他人', '善於協調', '追求平衡', '直覺敏銳']
  },
  {
    number: 3,
    name: '創意思維',
    description: '星座數3代表你的思維模式偏向創意和表達。你腦中總有源源不絕的點子，喜歡用新奇有趣的方式看待世界和解決問題。',
    traits: ['想法豐富', '表達力強', '樂觀積極', '靈活變通']
  },
  {
    number: 4,
    name: '務實思維',
    description: '星座數4代表你的思維模式偏向務實和系統化。你習慣有條理地分析問題，重視邏輯和效率，做事講究步驟和計畫。',
    traits: ['邏輯清晰', '計畫周詳', '注重效率', '重視安全']
  },
  {
    number: 5,
    name: '自信思維',
    description: '星座數5代表你的思維模式偏向自信和展現。你天生具有領袖氣質的思考方式，喜歡成為焦點，用熱情和魅力影響他人。',
    traits: ['自信展現', '熱情感染', '勇於冒險', '多元思考']
  },
  {
    number: 6,
    name: '服務思維',
    description: '星座數6代表你的思維模式偏向細膩和服務。你天生會注意到他人忽略的細節，傾向以幫助和改善的角度思考問題。',
    traits: ['細膩觀察', '追求完美', '服務精神', '分析能力']
  },
  {
    number: 7,
    name: '美感思維',
    description: '星座數7代表你的思維模式偏向平衡和美感。你在做決定時會追求公平正義，重視和諧的環境和人際關係。',
    traits: ['追求公平', '美感品味', '社交優雅', '權衡利弊']
  },
  {
    number: 8,
    name: '深度思維',
    description: '星座數8代表你的思維模式偏向深度和洞察。你不滿足於表面的資訊，總是想要探究事物的核心真相，具有強大的洞察力。',
    traits: ['洞察力強', '探究本質', '意志堅定', '策略思考']
  },
  {
    number: 9,
    name: '哲學思維',
    description: '星座數9代表你的思維模式偏向宏觀和哲學。你喜歡從更高的角度看待問題，對知識和真理有著強烈的渴望。',
    traits: ['宏觀視野', '追求真理', '樂觀進取', '哲學思考']
  }
]

/**
 * 根據數字取得星座數意義
 */
export function getZodiacNumberMeaning(number: number): ZodiacNumberMeaning | undefined {
  return ZODIAC_NUMBER_MEANINGS.find((m) => m.number === number)
}
