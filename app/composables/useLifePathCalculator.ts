import type { BirthDate, LifePathResult, GridData, Connection, SecondaryConnection, TalentNumbers, ZodiacSign, ZodiacInfo, PersonalYearNumber, PersonalMonthNumber, PersonalDayNumber, BirthdayNumber, ConditioningNumber, PinnacleNumbers, ChallengeNumbers, BodyMindSpiritAnalysis, LifeCycleNumbers, SecretCycleNumber, NameNumerology, MaturityNumber, FiveElementsAnalysis } from '~/shared/types'
import { getZodiacNumber, getZodiacInfo } from '~/shared/constants/zodiacData'
import { SECONDARY_CONNECTION_DEFINITIONS } from '~/shared/constants/connectionMeanings'
import { getLetterValue, isVowel } from '~/shared/constants/nameNumerologyMeanings'

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
 * 計算數字加總直到個位數（不考慮大師數）
 */
function reduceToSingleDigitSimple(num: number): number {
  let current = num
  while (current > 9) {
    const digits = splitToDigits(current)
    current = digits.reduce((a, b) => a + b, 0)
  }
  return current
}

/**
 * 計算數字加總直到個位數（保留大師數 11, 22）
 */
function reduceWithMaster(num: number): number {
  let current = num
  while (current > 9 && current !== 11 && current !== 22) {
    const digits = splitToDigits(current)
    current = digits.reduce((a, b) => a + b, 0)
  }
  return current
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
 * 計算生日數
 */
function calculateBirthdayNumber(day: number): BirthdayNumber {
  const steps: string[] = []
  if (day > 9) {
    const digits = splitToDigits(day)
    const sum = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${sum}`)
    let result = sum
    while (result > 9) {
      const d = splitToDigits(result)
      result = d.reduce((a, b) => a + b, 0)
      steps.push(`${d.join(' + ')} = ${result}`)
    }
    return { number: result, calculationSteps: steps }
  }
  return { number: day, calculationSteps: [`生日數即為 ${day}`] }
}

/**
 * 計算制約數
 */
function calculateConditioningNumber(month: number, day: number): ConditioningNumber {
  const steps: string[] = []
  const sum = month + day
  steps.push(`${month} + ${day} = ${sum}`)

  let result = sum
  while (result > 9) {
    const digits = splitToDigits(result)
    result = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${result}`)
  }
  return { number: result, calculationSteps: steps }
}

/**
 * 計算高峰數
 */
function calculatePinnacleNumbers(date: BirthDate, lifePathNumber: number): PinnacleNumbers {
  const steps: string[] = []
  const monthReduced = reduceToSingleDigitSimple(date.month)
  const dayReduced = reduceToSingleDigitSimple(date.day)
  const yearReduced = reduceToSingleDigitSimple(date.year)

  const lpSimple = lifePathNumber > 9 ? reduceToSingleDigitSimple(lifePathNumber) : lifePathNumber
  const firstEnd = 36 - lpSimple

  const p1 = reduceWithMaster(monthReduced + dayReduced)
  const p2 = reduceWithMaster(dayReduced + yearReduced)
  const p3 = reduceWithMaster(p1 + p2)
  const p4 = reduceWithMaster(monthReduced + yearReduced)

  steps.push(`月(${monthReduced}) + 日(${dayReduced}) = ${p1}`)
  steps.push(`日(${dayReduced}) + 年(${yearReduced}) = ${p2}`)
  steps.push(`第一高峰(${p1}) + 第二高峰(${p2}) = ${p3}`)
  steps.push(`月(${monthReduced}) + 年(${yearReduced}) = ${p4}`)

  const pinnacles = [
    { number: p1, ageRange: `0 - ${firstEnd} 歲` },
    { number: p2, ageRange: `${firstEnd + 1} - ${firstEnd + 9} 歲` },
    { number: p3, ageRange: `${firstEnd + 10} - ${firstEnd + 18} 歲` },
    { number: p4, ageRange: `${firstEnd + 19} 歲以後` }
  ]

  return { pinnacles, calculationSteps: steps }
}

/**
 * 計算挑戰數
 */
function calculateChallengeNumbers(date: BirthDate): ChallengeNumbers {
  const steps: string[] = []
  const monthReduced = reduceToSingleDigitSimple(date.month)
  const dayReduced = reduceToSingleDigitSimple(date.day)
  const yearReduced = reduceToSingleDigitSimple(date.year)

  const c1 = Math.abs(monthReduced - dayReduced)
  const c2 = Math.abs(dayReduced - yearReduced)
  const c3 = Math.abs(c1 - c2)
  const c4 = Math.abs(monthReduced - yearReduced)

  steps.push(`|月(${monthReduced}) - 日(${dayReduced})| = ${c1}`)
  steps.push(`|日(${dayReduced}) - 年(${yearReduced})| = ${c2}`)
  steps.push(`|第一挑戰(${c1}) - 第二挑戰(${c2})| = ${c3}`)
  steps.push(`|月(${monthReduced}) - 年(${yearReduced})| = ${c4}`)

  const challenges = [
    { number: c1, label: '第一挑戰' },
    { number: c2, label: '第二挑戰' },
    { number: c3, label: '主要挑戰' },
    { number: c4, label: '第四挑戰' }
  ]

  return { challenges, mainChallenge: c3, calculationSteps: steps }
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
 * 分析副連線
 */
function analyzeSecondaryConnections(grid: GridData): SecondaryConnection[] {
  return SECONDARY_CONNECTION_DEFINITIONS.map((conn) => ({
    ...conn,
    isActive: conn.numbers.every((num) => grid[num].count > 0)
  }))
}

/**
 * 計算流年數
 */
function calculatePersonalYearNumber(month: number, day: number, targetYear: number): PersonalYearNumber {
  const steps: string[] = []

  const monthDayDigits = splitToDigits(month).concat(splitToDigits(day))
  const monthDaySum = monthDayDigits.reduce((a, b) => a + b, 0)
  steps.push(`出生月日：${monthDayDigits.join(' + ')} = ${monthDaySum}`)

  let birthMonthDaySum = monthDaySum
  while (birthMonthDaySum > 9) {
    const digits = splitToDigits(birthMonthDaySum)
    birthMonthDaySum = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${birthMonthDaySum}`)
  }

  const yearDigits = splitToDigits(targetYear)
  const yearDigitSum = yearDigits.reduce((a, b) => a + b, 0)
  steps.push(`年份數字：${yearDigits.join(' + ')} = ${yearDigitSum}`)

  let yearSum = yearDigitSum
  while (yearSum > 9) {
    const digits = splitToDigits(yearSum)
    yearSum = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${yearSum}`)
  }

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
 * 計算流月數
 */
function calculatePersonalMonthNumber(personalYearNumber: number, targetMonth: number): PersonalMonthNumber {
  const steps: string[] = []
  const monthDigits = splitToDigits(targetMonth)
  const monthSum = monthDigits.reduce((a, b) => a + b, 0)

  const total = personalYearNumber + monthSum
  steps.push(`流年數(${personalYearNumber}) + 月份(${targetMonth}) = ${total}`)

  let result = total
  while (result > 9) {
    const digits = splitToDigits(result)
    result = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${result}`)
  }

  return { number: result, targetMonth, calculationSteps: steps }
}

/**
 * 計算流日數
 */
function calculatePersonalDayNumber(personalMonthNumber: number, targetDay: number): PersonalDayNumber {
  const steps: string[] = []
  const dayDigits = splitToDigits(targetDay)
  const daySum = dayDigits.reduce((a, b) => a + b, 0)

  const total = personalMonthNumber + daySum
  steps.push(`流月數(${personalMonthNumber}) + 日期(${targetDay}) = ${total}`)

  let result = total
  while (result > 9) {
    const digits = splitToDigits(result)
    result = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${result}`)
  }

  return { number: result, targetDay, calculationSteps: steps }
}

/**
 * 身心靈分析
 */
function analyzeBodyMindSpirit(gridData: GridData): BodyMindSpiritAnalysis {
  const bodyNums = [1, 4, 7]
  const mindNums = [2, 5, 8]
  const spiritNums = [3, 6, 9]

  const bodyCount = bodyNums.reduce((sum, n) => sum + gridData[n].count, 0)
  const mindCount = mindNums.reduce((sum, n) => sum + gridData[n].count, 0)
  const spiritCount = spiritNums.reduce((sum, n) => sum + gridData[n].count, 0)

  let dominant: BodyMindSpiritAnalysis['dominant'] = 'balanced'
  const max = Math.max(bodyCount, mindCount, spiritCount)
  const counts = [bodyCount, mindCount, spiritCount]
  const maxCount = counts.filter((c) => c === max).length

  if (maxCount === 1) {
    if (max === bodyCount) dominant = 'body'
    else if (max === mindCount) dominant = 'mind'
    else dominant = 'spirit'
  }

  return {
    body: { count: bodyCount, numbers: bodyNums },
    mind: { count: mindCount, numbers: mindNums },
    spirit: { count: spiritCount, numbers: spiritNums },
    dominant
  }
}

/**
 * 計算生命週期數
 */
function calculateLifeCycleNumbers(date: BirthDate): LifeCycleNumbers {
  const steps: string[] = []

  const earlyNum = reduceWithMaster(date.month)
  steps.push(`早期週期：月份 ${date.month} → ${earlyNum}`)

  const middleNum = reduceWithMaster(date.day)
  steps.push(`中期週期：日期 ${date.day} → ${middleNum}`)

  const yearDigits = splitToDigits(date.year)
  const yearSum = yearDigits.reduce((a, b) => a + b, 0)
  const lateNum = reduceWithMaster(yearSum)
  steps.push(`晚期週期：年份 ${date.year}（${yearDigits.join('+')}=${yearSum}）→ ${lateNum}`)

  return {
    earlyCycle: { number: earlyNum, ageRange: '出生 - 約 30 歲' },
    middleCycle: { number: middleNum, ageRange: '約 31 - 60 歲' },
    lateCycle: { number: lateNum, ageRange: '約 61 歲以後' },
    calculationSteps: steps
  }
}

/**
 * 計算秘密循環數
 */
function calculateSecretCycleNumber(lifePathNumber: number, personalYearNumber: number): SecretCycleNumber {
  const steps: string[] = []
  const lpSimple = lifePathNumber > 9 ? reduceToSingleDigitSimple(lifePathNumber) : lifePathNumber
  const total = lpSimple + personalYearNumber
  steps.push(`主命數(${lpSimple}) + 流年數(${personalYearNumber}) = ${total}`)

  let result = total
  while (result > 9) {
    const digits = splitToDigits(result)
    result = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${result}`)
  }

  return { number: result, calculationSteps: steps }
}

/**
 * 計算英文姓名靈數
 */
function calculateNameNumerology(fullName: string): NameNumerology {
  const letters = fullName.toUpperCase().replace(/[^A-Z]/g, '').split('')
  const expressionSteps: string[] = []
  const soulUrgeSteps: string[] = []
  const personalitySteps: string[] = []

  // 表達數（所有字母）
  const allValues = letters.map(l => getLetterValue(l))
  const allSum = allValues.reduce((a: number, b: number) => a + b, 0)
  expressionSteps.push(`${letters.join(' ')} → ${allValues.join(' + ')} = ${allSum}`)
  let expressionNum = allSum
  while (expressionNum > 9) {
    const digits = splitToDigits(expressionNum)
    expressionNum = digits.reduce((a, b) => a + b, 0)
    expressionSteps.push(`${digits.join(' + ')} = ${expressionNum}`)
  }

  // 靈魂渴望數（母音）
  const vowels = letters.filter(l => isVowel(l))
  const vowelValues = vowels.map(l => getLetterValue(l))
  const vowelSum = vowelValues.reduce((a: number, b: number) => a + b, 0)
  if (vowels.length > 0) {
    soulUrgeSteps.push(`母音：${vowels.join(' ')} → ${vowelValues.join(' + ')} = ${vowelSum}`)
  }
  let soulUrgeNum = vowelSum
  while (soulUrgeNum > 9) {
    const digits = splitToDigits(soulUrgeNum)
    soulUrgeNum = digits.reduce((a, b) => a + b, 0)
    soulUrgeSteps.push(`${digits.join(' + ')} = ${soulUrgeNum}`)
  }

  // 人格數（子音）
  const consonants = letters.filter(l => !isVowel(l))
  const consonantValues = consonants.map(l => getLetterValue(l))
  const consonantSum = consonantValues.reduce((a: number, b: number) => a + b, 0)
  if (consonants.length > 0) {
    personalitySteps.push(`子音：${consonants.join(' ')} → ${consonantValues.join(' + ')} = ${consonantSum}`)
  }
  let personalityNum = consonantSum
  while (personalityNum > 9) {
    const digits = splitToDigits(personalityNum)
    personalityNum = digits.reduce((a, b) => a + b, 0)
    personalitySteps.push(`${digits.join(' + ')} = ${personalityNum}`)
  }

  return {
    fullName,
    expressionNumber: expressionNum || 0,
    soulUrgeNumber: soulUrgeNum || 0,
    personalityNumber: personalityNum || 0,
    calculationSteps: {
      expression: expressionSteps,
      soulUrge: soulUrgeSteps,
      personality: personalitySteps
    }
  }
}

/**
 * 計算成熟數
 */
function calculateMaturityNumber(lifePathNumber: number, expressionNumber: number): MaturityNumber {
  const steps: string[] = []
  const lpSimple = lifePathNumber > 9 ? reduceToSingleDigitSimple(lifePathNumber) : lifePathNumber
  const total = lpSimple + expressionNumber
  steps.push(`主命數(${lpSimple}) + 表達數(${expressionNumber}) = ${total}`)

  let result = total
  while (result > 9) {
    const digits = splitToDigits(result)
    result = digits.reduce((a, b) => a + b, 0)
    steps.push(`${digits.join(' + ')} = ${result}`)
  }

  return { number: result, calculationSteps: steps }
}

/**
 * 五行分析
 */
function analyzeFiveElements(gridData: GridData): FiveElementsAnalysis {
  const elements = {
    water: { count: 0, numbers: [1] as number[] },
    wood: { count: 0, numbers: [3, 4] as number[] },
    fire: { count: 0, numbers: [9] as number[] },
    earth: { count: 0, numbers: [2, 5, 8] as number[] },
    metal: { count: 0, numbers: [6, 7] as number[] }
  }

  // 水: 1
  elements.water.count = gridData[1].count
  // 木: 3, 4
  elements.wood.count = gridData[3].count + gridData[4].count
  // 火: 9
  elements.fire.count = gridData[9].count
  // 土: 2, 5, 8
  elements.earth.count = gridData[2].count + gridData[5].count + gridData[8].count
  // 金: 6, 7
  elements.metal.count = gridData[6].count + gridData[7].count

  const nameMap: Record<string, string> = { water: '水', wood: '木', fire: '火', earth: '土', metal: '金' }
  const entries = Object.entries(elements) as [string, { count: number }][]
  const maxCount = Math.max(...entries.map(([, v]) => v.count))
  const dominant = entries.find(([, v]) => v.count === maxCount)?.[0] ?? 'earth'
  const weak = entries.filter(([, v]) => v.count === 0).map(([k]) => nameMap[k])

  return { elements, dominant: nameMap[dominant], weak }
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
    const secondaryConnections = analyzeSecondaryConnections(gridData)

    // 6. 計算生日數與制約數
    const birthdayNumber = calculateBirthdayNumber(date.day)
    const conditioningNumber = calculateConditioningNumber(date.month, date.day)

    // 7. 計算高峰數與挑戰數
    const pinnacleNumbers = calculatePinnacleNumbers(date, lifePathNumber)
    const challengeNumbers = calculateChallengeNumbers(date)

    const lifePathResult: LifePathResult = {
      lifePathNumber,
      isMasterNumber: MASTER_NUMBERS.includes(lifePathNumber),
      calculationSteps,
      gridData,
      missingNumbers,
      connections,
      secondaryConnections,
      talentNumbers,
      zodiacNumber,
      zodiacInfo,
      innateDigits,
      personalYearNumber: personalYearNum,
      birthdayNumber,
      conditioningNumber,
      pinnacleNumbers,
      challengeNumbers
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

  function calcPersonalMonth(personalYearNumber: number, targetMonth: number): PersonalMonthNumber {
    return calculatePersonalMonthNumber(personalYearNumber, targetMonth)
  }

  function calcPersonalDay(personalMonthNumber: number, targetDay: number): PersonalDayNumber {
    return calculatePersonalDayNumber(personalMonthNumber, targetDay)
  }

  function calcBodyMindSpirit(gridData: GridData): BodyMindSpiritAnalysis {
    return analyzeBodyMindSpirit(gridData)
  }

  function calcLifeCycles(date: BirthDate): LifeCycleNumbers {
    return calculateLifeCycleNumbers(date)
  }

  function calcSecretCycle(lifePathNumber: number, personalYearNumber: number): SecretCycleNumber {
    return calculateSecretCycleNumber(lifePathNumber, personalYearNumber)
  }

  function calcNameNumerology(fullName: string): NameNumerology {
    return calculateNameNumerology(fullName)
  }

  function calcMaturityNumber(lifePathNumber: number, expressionNumber: number): MaturityNumber {
    return calculateMaturityNumber(lifePathNumber, expressionNumber)
  }

  function calcFiveElements(gridData: GridData): FiveElementsAnalysis {
    return analyzeFiveElements(gridData)
  }

  return {
    result: readonly(result),
    calculate,
    calcPersonalYear,
    calcPersonalMonth,
    calcPersonalDay,
    calcBodyMindSpirit,
    calcLifeCycles,
    calcSecretCycle,
    calcNameNumerology,
    calcMaturityNumber,
    calcFiveElements,
    reset
  }
}
