// 日期相關類型
export interface BirthDate {
  year: number
  month: number
  day: number
}

// 星座類型
export type ZodiacSign =
  | 'aries' // 牡羊座
  | 'taurus' // 金牛座
  | 'gemini' // 雙子座
  | 'cancer' // 巨蟹座
  | 'leo' // 獅子座
  | 'virgo' // 處女座
  | 'libra' // 天秤座
  | 'scorpio' // 天蠍座
  | 'sagittarius' // 射手座
  | 'capricorn' // 摩羯座
  | 'aquarius' // 水瓶座
  | 'pisces' // 雙魚座

// 星座資訊
export interface ZodiacInfo {
  sign: ZodiacSign
  name: string
  number: number
  dateRange: string
}

// 天賦數
export interface TalentNumbers {
  numbers: number[]
  originalSum: number
  isSingleDigit: boolean
}

// 數字來源類型
export type NumberSource = 'innate' | 'lifePath' | 'talent' | 'zodiac' | 'personalYear'

// 數字來源統計
export interface NumberSources {
  innate: number
  lifePath: number
  talent: number
  zodiac: number
  personalYear: number
}

// 九宮格數字類型
export interface GridNumber {
  value: number
  count: number
  sources: NumberSources
}

// 九宮格資料結構
export interface GridData {
  [key: number]: GridNumber
}

// 連線類型
export interface Connection {
  id: string
  name: string
  numbers: [number, number, number]
  type: 'horizontal' | 'vertical' | 'diagonal'
  isActive: boolean
}

// 主命數結果
export interface LifePathResult {
  lifePathNumber: number
  isMasterNumber: boolean
  calculationSteps: string[]
  gridData: GridData
  missingNumbers: number[]
  connections: Connection[]
  talentNumbers: TalentNumbers
  zodiacNumber: number | null
  zodiacInfo: ZodiacInfo | null
  innateDigits: number[]
  personalYearNumber: number | null
}

// 數字意義
export interface NumberMeaning {
  number: number
  name: string
  keywords: string[]
  description: string
  strengths: string[]
  challenges: string[]
}

// 連線意義
export interface ConnectionMeaning {
  id: string
  name: string
  numbers: [number, number, number]
  description: string
  traits: string[]
}

// 天賦數意義
export interface TalentNumberMeaning {
  number: number
  name: string
  description: string
  talents: string[]
}

// 缺數意義
export interface MissingNumberMeaning {
  number: number
  name: string
  description: string
  suggestion: string
}

// 流年數
export interface PersonalYearNumber {
  number: number
  targetYear: number
  birthMonthDaySum: number
  yearSum: number
  calculationSteps: string[]
}
