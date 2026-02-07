interface CompatibilityEntry {
  pair: [number, number]
  score: number
  type: string
  description: string
}

const COMPATIBILITY_DATA: CompatibilityEntry[] = [
  // 1 配對
  { pair: [1, 1], score: 3, type: '挑戰', description: '兩個領袖在一起容易產生權力競爭，但若能互相尊重，將成為無敵搭檔。' },
  { pair: [1, 2], score: 5, type: '互補', description: '領導者與輔助者的完美組合。1號帶領方向，2號提供支持與細膩關懷。' },
  { pair: [1, 3], score: 4, type: '和諧', description: '行動力與創造力的結合。1號推動執行，3號帶來靈感和歡樂氣氛。' },
  { pair: [1, 4], score: 3, type: '互補', description: '開創者與建造者的組合。需要互相包容——1號的衝勁與4號的穩重有時會產生摩擦。' },
  { pair: [1, 5], score: 4, type: '刺激', description: '兩人都充滿活力和冒險精神。在一起永不無聊，但需要學習安定下來。' },
  { pair: [1, 6], score: 3, type: '互補', description: '獨立與照顧的拉鋸。1號需要空間，6號渴望親密，需要找到平衡點。' },
  { pair: [1, 7], score: 3, type: '挑戰', description: '行動派與思考派的碰撞。1號覺得7號太慢，7號覺得1號太急，但能互相學習。' },
  { pair: [1, 8], score: 5, type: '和諧', description: '權力二人組！都有野心和執行力，在事業上是最佳夥伴，私下需要放軟身段。' },
  { pair: [1, 9], score: 4, type: '和諧', description: '開創者與智者的結合。1號帶來行動力，9號帶來寬廣視野，相輔相成。' },
  // 2 配對
  { pair: [2, 2], score: 4, type: '和諧', description: '兩個敏感靈魂在一起，彼此理解很深。但需要注意不要陷入過度退讓的循環。' },
  { pair: [2, 3], score: 4, type: '和諧', description: '敏感與歡樂的組合。3號為2號帶來笑聲，2號為3號提供情感深度。' },
  { pair: [2, 4], score: 4, type: '互補', description: '穩定且溫馨的搭配。兩人都重視安全感，能建立穩固且溫暖的關係。' },
  { pair: [2, 5], score: 2, type: '挑戰', description: '穩定與自由的衝突。2號渴望陪伴，5號渴望自由，需要大量溝通和妥協。' },
  { pair: [2, 6], score: 5, type: '和諧', description: '愛與關懷的夢幻組合。兩人都重視家庭和感情，能建立充滿愛的溫馨關係。' },
  { pair: [2, 7], score: 3, type: '互補', description: '感性與理性的結合。2號帶來溫暖，7號帶來智慧，但需要尊重彼此的節奏。' },
  { pair: [2, 8], score: 4, type: '互補', description: '溫柔與強勢的組合。2號的支持讓8號更有力量，8號的保護讓2號感到安心。' },
  { pair: [2, 9], score: 4, type: '和諧', description: '敏感與大愛的連結。兩人都富有同理心，在精神層面有深度的共鳴。' },
  // 3 配對
  { pair: [3, 3], score: 4, type: '刺激', description: '超級歡樂組合！生活充滿笑聲和創意，但需要有人負責實際事務。' },
  { pair: [3, 4], score: 3, type: '挑戰', description: '創意與紀律的碰撞。3號覺得4號太嚴肅，4號覺得3號太散漫，但能互相平衡。' },
  { pair: [3, 5], score: 5, type: '刺激', description: '活力四射的組合！兩人都愛冒險和新鮮感，生活永遠精彩不斷。' },
  { pair: [3, 6], score: 4, type: '和諧', description: '創意與愛的結合。3號帶來歡樂，6號帶來溫暖，家庭氣氛融洽美滿。' },
  { pair: [3, 7], score: 3, type: '互補', description: '外向與內向的配對。3號的社交力與7號的深度思考可以互補，但需要理解差異。' },
  { pair: [3, 8], score: 4, type: '互補', description: '創意加上執行力的黃金組合。3號提出點子，8號負責實現，合作效率極高。' },
  { pair: [3, 9], score: 5, type: '和諧', description: '創造力的巔峰組合。兩人都充滿想像力和表達力，能共同創造美好事物。' },
  // 4 配對
  { pair: [4, 4], score: 3, type: '穩定', description: '超級穩定的組合，但可能缺乏驚喜。需要刻意為生活增添變化和浪漫。' },
  { pair: [4, 5], score: 2, type: '挑戰', description: '穩定與變化的拉鋸戰。4號想安定，5號想探索，需要大量的互相包容。' },
  { pair: [4, 6], score: 5, type: '和諧', description: '家庭型的完美搭配。兩人都重視穩定和責任，能建立令人羨慕的家庭。' },
  { pair: [4, 7], score: 4, type: '互補', description: '務實與智慧的結合。4號帶來實踐力，7號帶來洞察力，搭配得宜就是黃金團隊。' },
  { pair: [4, 8], score: 5, type: '和諧', description: '建設者與成就者的強力組合。共同目標明確，執行力超強，事業愛情皆可兼顧。' },
  { pair: [4, 9], score: 3, type: '互補', description: '務實與理想的配對。4號幫助9號落實想法，9號幫助4號拓展視野。' },
  // 5 配對
  { pair: [5, 5], score: 3, type: '刺激', description: '超級自由組合！永遠在冒險，但可能缺乏穩定性，需要學習承諾和定下來。' },
  { pair: [5, 6], score: 3, type: '挑戰', description: '自由與責任的衝突。5號想飛，6號想守護家園。需要找到讓雙方都舒服的距離。' },
  { pair: [5, 7], score: 4, type: '互補', description: '探索者的組合。5號探索外在世界，7號探索內在世界，能豐富彼此的生命。' },
  { pair: [5, 8], score: 4, type: '刺激', description: '充滿動力的組合。兩人都追求更多更好，在一起充滿挑戰但也充滿成就感。' },
  { pair: [5, 9], score: 4, type: '和諧', description: '自由與博愛的結合。兩人都有寬廣的視野，不會束縛對方，相處輕鬆自在。' },
  // 6 配對
  { pair: [6, 6], score: 4, type: '和諧', description: '充滿愛的家庭組合。兩人都擅長照顧他人，但要小心不要互相過度干涉。' },
  { pair: [6, 7], score: 3, type: '互補', description: '愛與智慧的結合。6號帶來溫暖，7號帶來深度，但社交需求差異大。' },
  { pair: [6, 8], score: 4, type: '互補', description: '愛與成就的組合。6號照顧家庭，8號創造物質基礎，分工明確且互補。' },
  { pair: [6, 9], score: 5, type: '和諧', description: '大愛組合！兩人都富有愛心和服務精神，能共同為社會貢獻正面力量。' },
  // 7 配對
  { pair: [7, 7], score: 3, type: '互補', description: '兩個思考者在一起，精神層面交流極深，但需要注意不要太封閉自己。' },
  { pair: [7, 8], score: 3, type: '互補', description: '智慧與權力的配對。7號提供策略，8號負責執行。互相尊重就能無敵。' },
  { pair: [7, 9], score: 4, type: '和諧', description: '智者的對話。兩人都追求深度和意義，能在精神層面建立深刻的連結。' },
  // 8 配對
  { pair: [8, 8], score: 3, type: '挑戰', description: '權力雙雄！兩人都想掌控，容易產生衝突。但若能合作，將創造驚人成就。' },
  { pair: [8, 9], score: 4, type: '互補', description: '成就與智慧的結合。8號帶來物質成功，9號帶來精神富足，完整的人生組合。' },
  // 9 配對
  { pair: [9, 9], score: 4, type: '和諧', description: '兩個老靈魂在一起，相知相惜。有時太超然世外，需要記得回到現實。' }
]

/**
 * 取得兩個主命數的配對分析
 */
export function getCompatibility(a: number, b: number): { score: number; type: string; description: string } {
  // 將大師數縮減為根數
  const numA = a > 9 ? (a === 11 ? 2 : a === 22 ? 4 : a === 33 ? 6 : a) : a
  const numB = b > 9 ? (b === 11 ? 2 : b === 22 ? 4 : b === 33 ? 6 : b) : b

  const min = Math.min(numA, numB)
  const max = Math.max(numA, numB)

  const entry = COMPATIBILITY_DATA.find((e) => e.pair[0] === min && e.pair[1] === max)
  if (entry) {
    return { score: entry.score, type: entry.type, description: entry.description }
  }
  return { score: 3, type: '一般', description: '兩人有各自的特質，透過理解和溝通可以建立良好的關係。' }
}
