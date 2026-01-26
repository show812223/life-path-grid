import type { BirthDate, LifePathResult, GridData, Connection, TalentNumbers, ZodiacSign, ZodiacInfo, PersonalYearNumber } from '~/shared/types'
import { getZodiacNumber, getZodiacInfo } from '~/shared/constants/zodiacData'

// 大師數
const MASTER_NUMBERS = [11, 22, 33]

// 8條連線定義
const CONNECTION_DEFINITIONS: Omit<Connection, 'isActive'>[] = [
  // 橫線
  { id: 'h1', name: '行動線', numbers: [1, 4, 7], type: 'horizontal' },
  { id: 'h2', name: '情感線', numbers: [2, 5, 8], type: 'horizontal' },
  { id: 'h3', name: '智慧線', numbers: [3, 6, 9], type: 'horizontal' },
  // 縱線
  { id: 'v1', name: '思想線', numbers: [3, 2, 1], type: 'vertical' },
  { id: 'v2', name: '意志線', numbers: [6, 5, 4], type: 'vertical' },
  { id: 'v3', name: '執行線', numbers: [9, 8, 7], type: 'vertical' },
  // 斜線
  { id: 'd1', name: '人際線', numbers: [3, 5, 7], type: 'diagonal' },
  { id: 'd2', name: '天賦線', numbers: [1, 5, 9], type: 'diagonal' }
]

/**
 * 將數字分解為個位數陣列
 */
function splitToDigits(num: number): number[] {
  return String(num).split('').map(Number)
}

/**
 * 計算數字加總直到個位數（或大師數）
 */
function reduceToSingleDigit(num: number): { result: number; steps: string[] } {
  const steps: string[] = []
  let current = num

  while (current > 9 && !MASTER_NUMBERS.includes(current)) {
    const digits = splitToDigits(current)
    const sum = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${sum}`)
    current = sum
  }

  return { result: current, steps }
}

/**
 * 計算主命數
 */
function calculateLifePathNumber(date: BirthDate): {
  lifePathNumber: number
  calculationSteps: string[]
  totalSum: number
} {
  const dateString = `${date.year}${String(date.month).padStart(2, '0')}${String(date.day).padStart(2, '0')}`
  const digits = splitToDigits(Number(dateString))
  const sum = digits.reduce((a, b) => a + b, 0)

  const initialStep = `${digits.join(' + ')} = ${sum}`
  const { result, steps } = reduceToSingleDigit(sum)

  return {
    lifePathNumber: result,
    calculationSteps: [initialStep, ...steps],
    totalSum: sum
  }
}

/**
 * 計算天賦數
 * 天賦數是總和縮減成個位數之前的那兩個數字
 */
function calculateTalentNumbers(sum: number): TalentNumbers {
  // 情況1：個位數
  if (sum >= 1 && sum <= 9) {
    return {
      numbers: [sum],
      originalSum: sum,
      isSingleDigit: true
    }
  }

  // 情況2 & 3：兩位數（包含大師數）
  const digits = splitToDigits(sum)
  return {
    numbers: digits,
    originalSum: sum,
    isSingleDigit: false
  }
}

/**
 * 初始化空的九宮格
 */
function initializeGrid(): GridData {
  const grid: GridData = {}
  for (let i = 1; i <= 9; i++) {
    grid[i] = {
      value: i,
      count: 0,
      sources: { innate: 0, lifePath: 0, talent: 0, zodiac: 0, personalYear: 0 }
    }
  }
  return grid
}

/**
 * 分析九宮格數字分布（包含五種來源）
 */
function analyzeGrid(
  date: BirthDate,
  lifePathNumber: number,
  talentNumbers: TalentNumbers,
  zodiacNumber: number | null,
  personalYearNumber: number | null
): { gridData: GridData; innateDigits: number[] } {
  const dateString = `${date.year}${String(date.month).padStart(2, '0')}${String(date.day).padStart(2, '0')}`
  const allDigits = splitToDigits(Number(dateString))
  const innateDigits = allDigits.filter((d) => d !== 0)

  const grid = initializeGrid()

  // 1. 統計先天數（出生日期數字，忽略 0）
  innateDigits.forEach((digit) => {
    if (digit >= 1 && digit <= 9) {
      grid[digit].count++
      grid[digit].sources.innate++
    }
  })

  // 2. 加入主命數（大師數 11→1, 22→2, 33→3）
  const lifePathDigit = lifePathNumber > 9 ? Math.floor(lifePathNumber / 11) : lifePathNumber
  if (lifePathDigit >= 1 && lifePathDigit <= 9) {
    grid[lifePathDigit].count++
    grid[lifePathDigit].sources.lifePath++
  }

  // 3. 加入天賦數
  talentNumbers.numbers.forEach((digit) => {
    if (digit >= 1 && digit <= 9) {
      grid[digit].count++
      grid[digit].sources.talent++
    }
  })

  // 4. 加入星座數（如果有選擇）
  if (zodiacNumber !== null && zodiacNumber >= 1 && zodiacNumber <= 9) {
    grid[zodiacNumber].count++
    grid[zodiacNumber].sources.zodiac++
  }

  // 5. 加入流年數（如果有計算）
  if (personalYearNumber !== null && personalYearNumber >= 1 && personalYearNumber <= 9) {
    grid[personalYearNumber].count++
    grid[personalYearNumber].sources.personalYear++
  }

  return { gridData: grid, innateDigits }
}

/**
 * 找出缺數
 */
function findMissingNumbers(grid: GridData): number[] {
  const missing: number[] = []
  for (let i = 1; i <= 9; i++) {
    if (grid[i].count === 0) {
      missing.push(i)
    }
  }
  return missing
}

/**
 * 分析連線
 */
function analyzeConnections(grid: GridData): Connection[] {
  return CONNECTION_DEFINITIONS.map((conn) => ({
    ...conn,
    isActive: conn.numbers.every((num) => grid[num].count > 0)
  }))
}

/**
 * 計算流年數
 * 1. 出生月日數字加總成一位數
 * 2. 目標年份數字加總成一位數
 * 3. 兩者相加並化為一位數
 */
function calculatePersonalYearNumber(month: number, day: number, targetYear: number): PersonalYearNumber {
  const steps: string[] = []

  // 步驟 1：出生月日加總
  const monthDayDigits = splitToDigits(month).concat(splitToDigits(day))
  const monthDaySum = monthDayDigits.reduce((a, b) => a + b, 0)
  steps.push(`出生月日：${monthDayDigits.join(' + ')} = ${monthDaySum}`)

  let birthMonthDaySum = monthDaySum
  while (birthMonthDaySum > 9) {
    const digits = splitToDigits(birthMonthDaySum)
    birthMonthDaySum = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${birthMonthDaySum}`)
  }

  // 步驟 2：年份數字加總
  const yearDigits = splitToDigits(targetYear)
  const yearDigitSum = yearDigits.reduce((a, b) => a + b, 0)
  steps.push(`年份數字：${yearDigits.join(' + ')} = ${yearDigitSum}`)

  let yearSum = yearDigitSum
  while (yearSum > 9) {
    const digits = splitToDigits(yearSum)
    yearSum = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${yearSum}`)
  }

  // 步驟 3：相加並化為一位數
  const total = birthMonthDaySum + yearSum
  steps.push(`加總：${birthMonthDaySum} + ${yearSum} = ${total}`)

  let finalNumber = total
  while (finalNumber > 9) {
    const digits = splitToDigits(finalNumber)
    finalNumber = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${finalNumber}`)
  }

  return {
    number: finalNumber,
    targetYear,
    birthMonthDaySum,
    yearSum,
    calculationSteps: steps
  }
}

/**
 * 生命靈數計算 Composable
 */
export function useLifePathCalculator() {
  const result = ref<LifePathResult | null>(null)

  function calculate(date: BirthDate, zodiacSign: ZodiacSign | null = null, personalYearNum: number | null = null): LifePathResult {
    // 1. 計算主命數
    const { lifePathNumber, calculationSteps, totalSum } = calculateLifePathNumber(date)

    // 2. 計算天賦數
    const talentNumbers = calculateTalentNumbers(totalSum)

    // 3. 取得星座資訊
    const zodiacNumber = zodiacSign ? getZodiacNumber(zodiacSign) : null
    const zodiacInfo: ZodiacInfo | null = zodiacSign ? (getZodiacInfo(zodiacSign) ?? null) : null

    // 4. 分析九宮格（包含所有數字來源）
    const { gridData, innateDigits } = analyzeGrid(date, lifePathNumber, talentNumbers, zodiacNumber, personalYearNum)

    // 5. 分析缺數與連線
    const missingNumbers = findMissingNumbers(gridData)
    const connections = analyzeConnections(gridData)

    const lifePathResult: LifePathResult = {
      lifePathNumber,
      isMasterNumber: MASTER_NUMBERS.includes(lifePathNumber),
      calculationSteps,
      gridData,
      missingNumbers,
      connections,
      talentNumbers,
      zodiacNumber,
      zodiacInfo,
      innateDigits,
      personalYearNumber: personalYearNum
    }

    result.value = lifePathResult
    return lifePathResult
  }

  function reset() {
    result.value = null
  }

  function calcPersonalYear(month: number, day: number, targetYear: number): PersonalYearNumber {
    return calculatePersonalYearNumber(month, day, targetYear)
  }

  return {
    result: readonly(result),
    calculate,
    calcPersonalYear,
    reset
  }
}
