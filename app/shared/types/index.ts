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

// 副連線類型
export interface SecondaryConnection {
  id: string
  name: string
  numbers: [number, number]
  isActive: boolean
}

// 生日數
export interface BirthdayNumber {
  number: number
  calculationSteps: string[]
}

// 制約數
export interface ConditioningNumber {
  number: number
  calculationSteps: string[]
}

// 高峰數
export interface PinnacleNumbers {
  pinnacles: {
    number: number
    ageRange: string
  }[]
  calculationSteps: string[]
}

// 挑戰數
export interface ChallengeNumbers {
  challenges: {
    number: number
    label: string
  }[]
  mainChallenge: number
  calculationSteps: string[]
}

// 主命數結果
export interface LifePathResult {
  lifePathNumber: number
  isMasterNumber: boolean
  calculationSteps: string[]
  gridData: GridData
  missingNumbers: number[]
  connections: Connection[]
  secondaryConnections: SecondaryConnection[]
  talentNumbers: TalentNumbers
  zodiacNumber: number | null
  zodiacInfo: ZodiacInfo | null
  innateDigits: number[]
  personalYearNumber: number | null
  birthdayNumber: BirthdayNumber
  conditioningNumber: ConditioningNumber
  pinnacleNumbers: PinnacleNumbers
  challengeNumbers: ChallengeNumbers
}

// 數字意義
export interface NumberMeaning {
  number: number
  name: string
  keywords: string[]
  description: string
  strengths: string[]
  challenges: string[]
  career: string[]
  relationship: string
}

// 連線意義
export interface ConnectionMeaning {
  id: string
  name: string
  numbers: [number, number, number]
  description: string
  traits: string[]
  highFrequency: string
  lowFrequency: string
}

// 副連線意義
export interface SecondaryConnectionMeaning {
  id: string
  name: string
  numbers: [number, number]
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
  luckyColor: string
  crystal: string
  essentialOil: string
}

// 流年數
export interface PersonalYearNumber {
  number: number
  targetYear: number
  birthMonthDaySum: number
  yearSum: number
  calculationSteps: string[]
}

// 流年數意義
export interface PersonalYearMeaning {
  number: number
  name: string
  theme: string
  description: string
  advice: string
}

// 星座數意義
export interface ZodiacNumberMeaning {
  number: number
  name: string
  description: string
  traits: string[]
}

// 圈數意義
export interface CircleCountMeaning {
  count: number
  label: string
  description: string
}

// 生日數意義
export interface BirthdayNumberMeaning {
  number: number
  name: string
  description: string
}

// 制約數意義
export interface ConditioningNumberMeaning {
  number: number
  name: string
  description: string
}

// 高峰數意義
export interface PinnacleNumberMeaning {
  number: number
  name: string
  description: string
}

// 挑戰數意義
export interface ChallengeNumberMeaning {
  number: number
  name: string
  description: string
}

// 流月數
export interface PersonalMonthNumber {
  number: number
  targetMonth: number
  calculationSteps: string[]
}

// 流日數
export interface PersonalDayNumber {
  number: number
  targetDay: number
  calculationSteps: string[]
}

// 身心靈分析
export interface BodyMindSpiritAnalysis {
  body: { count: number; numbers: number[] }
  mind: { count: number; numbers: number[] }
  spirit: { count: number; numbers: number[] }
  dominant: 'body' | 'mind' | 'spirit' | 'balanced'
}

// 生命週期數
export interface LifeCycleNumbers {
  earlyCycle: { number: number; ageRange: string }
  middleCycle: { number: number; ageRange: string }
  lateCycle: { number: number; ageRange: string }
  calculationSteps: string[]
}

// 生命週期數意義
export interface LifeCycleMeaning {
  number: number
  name: string
  description: string
}
