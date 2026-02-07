// 數字五行對照
// 水: 1   木: 3, 4   土: 2, 5, 8   金: 6, 7   火: 9
export const NUMBER_ELEMENT_MAP: Record<number, string> = {
  1: '水',
  2: '土',
  3: '木',
  4: '木',
  5: '土',
  6: '金',
  7: '金',
  8: '土',
  9: '火'
}

export interface ElementInfo {
  name: string
  color: string
  icon: string
  numbers: number[]
  description: string
  excess: string
  deficient: string
}

export const ELEMENT_INFO: Record<string, ElementInfo> = {
  木: {
    name: '木',
    color: '#6A9A73',
    icon: 'mdi:tree',
    numbers: [3, 4],
    description: '代表成長、創造力與仁慈。木性的人善於計畫，富有想像力。',
    excess: '過多的木會讓人固執、急躁，容易鑽牛角尖。',
    deficient: '缺乏木會讓人缺少規劃能力，行動力不足，創意匱乏。'
  },
  火: {
    name: '火',
    color: '#D4756A',
    icon: 'mdi:fire',
    numbers: [9],
    description: '代表熱情、行動力與禮儀。火性的人充滿能量，善於激勵他人。',
    excess: '過多的火會讓人衝動、急躁，容易與人起衝突。',
    deficient: '缺乏火會讓人缺少熱情，行動力不足，缺乏感染力。'
  },
  土: {
    name: '土',
    color: '#C4966A',
    icon: 'mdi:terrain',
    numbers: [2, 5, 8],
    description: '代表穩定、包容與信用。土性的人踏實可靠，重視承諾。',
    excess: '過多的土會讓人過度保守、固執，抗拒改變。',
    deficient: '缺乏土會讓人缺少耐心，做事不夠踏實，承諾力弱。'
  },
  金: {
    name: '金',
    color: '#A7A2B0',
    icon: 'mdi:diamond-stone',
    numbers: [6, 7],
    description: '代表決斷、正義與毅力。金性的人意志堅定，做事果斷。',
    excess: '過多的金會讓人過於嚴厲、不通人情，過度追求完美。',
    deficient: '缺乏金會讓人優柔寡斷，缺少執行力和紀律性。'
  },
  水: {
    name: '水',
    color: '#6A9AB0',
    icon: 'mdi:water',
    numbers: [1],
    description: '代表智慧、靈活與溝通。水性的人聰明機智，善於適應環境。',
    excess: '過多的水會讓人過度思慮、多疑，情緒不穩定。',
    deficient: '缺乏水會讓人缺少變通能力，思維僵化，溝通不順。'
  }
}

// 五行相生順序：木→火→土→金→水→木
export const GENERATING_CYCLE = ['木', '火', '土', '金', '水']

// 五行相剋順序：木→土→水→火→金→木
export const OVERCOMING_CYCLE = ['木', '土', '水', '火', '金']
