import type { ConnectionMeaning, SecondaryConnectionMeaning } from '~/shared/types'

// 主連線意義（8條三數連線）
export const CONNECTION_MEANINGS: ConnectionMeaning[] = [
  // 橫線
  {
    id: 'h1',
    name: '行動線',
    highFreqName: '務實線',
    lowFreqName: '貪財線',
    numbers: [1, 4, 7],
    description: '代表行動力與執行力。擁有此連線的人做事果斷，行動力強，能夠將想法付諸實踐。',
    traits: ['執行力強', '行動果斷', '實踐能力佳', '腳踏實地'],
    highFrequency: '展現強大的行動力，說做就做，效率極高，是團隊中的實踐者。擅長將計畫轉化為具體成果。',
    lowFrequency: '可能變得莽撞衝動，不經思考就行動。或者過於執著於行動而忽略了方向是否正確。'
  },
  {
    id: 'h2',
    name: '情感線',
    highFreqName: '溝通線',
    lowFreqName: '心直口快線',
    numbers: [2, 5, 8],
    description: '代表情感與人際關係。擁有此連線的人情感豐富，善於處理人際關係，具有同理心。',
    traits: ['情感豐富', '人際關係佳', '富有同理心', '善於溝通'],
    highFrequency: '情感表達真摯自然，能與他人建立深刻的連結。善於感知氛圍，在社交場合中游刃有餘。',
    lowFrequency: '可能過度情緒化，容易被情感左右判斷。或是用情感操控他人，讓人感到壓力。'
  },
  {
    id: 'h3',
    name: '智慧線',
    highFreqName: '理想線',
    lowFreqName: '空想線',
    numbers: [3, 6, 9],
    description: '代表智慧與思考能力。擁有此連線的人思維敏捷，具有創造力和分析能力。',
    traits: ['思維敏捷', '智慧出眾', '創造力強', '分析能力佳'],
    highFrequency: '思考敏捷，學習力強，能舉一反三。善於從不同角度分析問題，提出獨特的見解。',
    lowFrequency: '可能過度空想而不實際行動，或是太執著於理論而忽略現實。容易好高騖遠。'
  },
  // 縱線
  {
    id: 'v1',
    name: '思想線',
    highFreqName: '藝術線',
    lowFreqName: '任性線',
    numbers: [3, 2, 1],
    description: '代表思想與理念。擁有此連線的人具有獨特的思想體系，善於概念化和理論分析。',
    traits: ['思想深刻', '理念清晰', '概念能力強', '善於分析'],
    highFrequency: '擁有獨立且深刻的思想體系，善於將抽象概念具體化。能夠說服他人接受自己的理念。',
    lowFrequency: '可能變得固執己見，聽不進不同意見。或是過度沉浸在自己的想法中而脫離現實。'
  },
  {
    id: 'v2',
    name: '意志線',
    highFreqName: '組織線',
    lowFreqName: '完美主義線',
    numbers: [6, 5, 4],
    description: '代表意志力與決心。擁有此連線的人意志堅定，面對困難不輕易放棄。',
    traits: ['意志堅定', '決心強烈', '堅持不懈', '有恆心'],
    highFrequency: '擁有鋼鐵般的意志力，認定目標就會堅持到底。面對挫折能迅速恢復，越挫越勇。',
    lowFrequency: '可能變得過於固執，不知變通。或是在不值得堅持的事情上浪費時間和精力。'
  },
  {
    id: 'v3',
    name: '執行線',
    highFreqName: '貴人線',
    lowFreqName: '權力線',
    numbers: [9, 8, 7],
    description: '代表執行力與達成目標的能力。擁有此連線的人目標明確，能夠有效地完成任務。',
    traits: ['目標明確', '執行力強', '效率高', '成果導向'],
    highFrequency: '有貴人運，做事容易得到他人的幫助。具有強大的整合能力，能調動資源達成目標。',
    lowFrequency: '可能過度依賴他人或走捷徑。或是太注重結果而忽略過程中的學習和成長。'
  },
  // 斜線
  {
    id: 'd1',
    name: '人際線',
    highFreqName: '人際溝通線',
    lowFreqName: '爭寵線',
    numbers: [3, 5, 7],
    description: '代表人際交往能力與個人魅力。擁有此連線的人社交能力強，善於與各種人相處。',
    traits: ['社交能力強', '人緣好', '善於交際', '適應力強'],
    highFrequency: '天生具有吸引他人的魅力，在任何社交場合都能如魚得水。善於建立廣泛的人脈網絡。',
    lowFrequency: '可能變得過度自戀或虛偽，用魅力操控他人。或是社交過多而忽略了真正重要的深度關係。'
  },
  {
    id: 'd2',
    name: '天賦線',
    highFreqName: '領袖線',
    lowFreqName: '事業狂線',
    numbers: [1, 5, 9],
    description: '代表事業成就與天賦潛能。擁有此連線的人具有獨特的天賦，在事業上有很大的發展潛力。',
    traits: ['天賦異稟', '潛能豐富', '直覺敏銳', '領悟力強'],
    highFrequency: '事業運極佳，擅長把握機會。具有遠見和行動力的完美結合，能將理想化為實際成就。',
    lowFrequency: '可能成為工作狂，忽略家庭和感情。或是野心過大，承擔過多壓力而身心俱疲。'
  }
]

// 副連線意義（兩數連線）
export const SECONDARY_CONNECTION_MEANINGS: SecondaryConnectionMeaning[] = [
  {
    id: 's1',
    name: '機靈線',
    numbers: [2, 4],
    description: '擁有靈活的應變能力和機智的頭腦。反應快速，善於在變化的環境中找到出路。',
    traits: ['反應靈敏', '隨機應變', '聰明機智', '靈活變通']
  },
  {
    id: 's2',
    name: '正義線',
    numbers: [2, 6],
    description: '具有強烈的正義感和公平意識。願意為弱者發聲，追求公正和諧的社會環境。',
    traits: ['正義感強', '公平公正', '樂於助人', '追求和平']
  },
  {
    id: 's3',
    name: '財富線',
    numbers: [4, 8],
    description: '具有良好的理財頭腦和財富管理能力。善於把握投資機會，累積物質資源。',
    traits: ['理財能力', '商業眼光', '累積財富', '務實理財']
  },
  {
    id: 's4',
    name: '誠懇線',
    numbers: [6, 8],
    description: '為人真誠坦率，做事踏實可靠。重視承諾和信用，是值得深交的朋友和夥伴。',
    traits: ['真誠待人', '踏實可靠', '重視信用', '溫暖服務']
  },
  {
    id: 's5',
    name: '敏感線',
    numbers: [1, 2],
    description: '對環境和他人的情緒有高度敏感性。能快速覺察到細微的變化，具有良好的直覺。',
    traits: ['高度敏感', '直覺敏銳', '覺察力強', '情緒感知']
  },
  {
    id: 's6',
    name: '完美線',
    numbers: [4, 6],
    description: '追求完美主義，對自己和他人都有較高的標準。做事一絲不苟，注重品質和細節。',
    traits: ['追求完美', '高標準', '注重細節', '一絲不苟']
  }
]

// 副連線定義（用於判斷是否形成）
export const SECONDARY_CONNECTION_DEFINITIONS = SECONDARY_CONNECTION_MEANINGS.map((m) => ({
  id: m.id,
  name: m.name,
  numbers: m.numbers as [number, number]
}))

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

/**
 * 根據副連線ID取得意義
 */
export function getSecondaryConnectionMeaning(id: string): SecondaryConnectionMeaning | undefined {
  return SECONDARY_CONNECTION_MEANINGS.find((c) => c.id === id)
}
