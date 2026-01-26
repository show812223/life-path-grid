import type { ConnectionMeaning } from '~/shared/types'

// 連線意義
export const CONNECTION_MEANINGS: ConnectionMeaning[] = [
  // 橫線
  {
    id: 'h1',
    name: '行動線',
    numbers: [1, 4, 7],
    description: '代表行動力與執行力。擁有此連線的人做事果斷，行動力強，能夠將想法付諸實踐。',
    traits: ['執行力強', '行動果斷', '實踐能力佳', '腳踏實地']
  },
  {
    id: 'h2',
    name: '情感線',
    numbers: [2, 5, 8],
    description: '代表情感與人際關係。擁有此連線的人情感豐富，善於處理人際關係，具有同理心。',
    traits: ['情感豐富', '人際關係佳', '富有同理心', '善於溝通']
  },
  {
    id: 'h3',
    name: '智慧線',
    numbers: [3, 6, 9],
    description: '代表智慧與思考能力。擁有此連線的人思維敏捷，具有創造力和分析能力。',
    traits: ['思維敏捷', '智慧出眾', '創造力強', '分析能力佳']
  },
  // 縱線
  {
    id: 'v1',
    name: '思想線',
    numbers: [3, 2, 1],
    description: '代表思想與理念。擁有此連線的人具有獨特的思想體系，善於概念化和理論分析。',
    traits: ['思想深刻', '理念清晰', '概念能力強', '善於分析']
  },
  {
    id: 'v2',
    name: '意志線',
    numbers: [6, 5, 4],
    description: '代表意志力與決心。擁有此連線的人意志堅定，面對困難不輕易放棄。',
    traits: ['意志堅定', '決心強烈', '堅持不懈', '有恆心']
  },
  {
    id: 'v3',
    name: '執行線',
    numbers: [9, 8, 7],
    description: '代表執行力與達成目標的能力。擁有此連線的人目標明確，能夠有效地完成任務。',
    traits: ['目標明確', '執行力強', '效率高', '成果導向']
  },
  // 斜線
  {
    id: 'd1',
    name: '人際線',
    numbers: [3, 5, 7],
    description: '代表人際交往能力。擁有此連線的人社交能力強，善於與各種人相處。',
    traits: ['社交能力強', '人緣好', '善於交際', '適應力強']
  },
  {
    id: 'd2',
    name: '天賦線',
    numbers: [1, 5, 9],
    description: '代表天賦與潛能。擁有此連線的人具有獨特的天賦，潛力無限。',
    traits: ['天賦異稟', '潛能豐富', '直覺敏銳', '領悟力強']
  }
]

/**
 * 根據連線ID取得意義
 */
export function getConnectionMeaning(id: string): ConnectionMeaning | undefined {
  return CONNECTION_MEANINGS.find((c) => c.id === id)
}

/**
 * 取得所有連線意義
 */
export function getAllConnectionMeanings(): ConnectionMeaning[] {
  return CONNECTION_MEANINGS
}
