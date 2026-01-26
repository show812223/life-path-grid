import type { ZodiacSign, ZodiacInfo } from '~/shared/types'

// 星座對應數字映射
export const ZODIAC_NUMBER_MAP: Record<ZodiacSign, number> = {
  aries: 1, // 牡羊座
  capricorn: 1, // 摩羯座
  taurus: 2, // 金牛座
  aquarius: 2, // 水瓶座
  gemini: 3, // 雙子座
  pisces: 3, // 雙魚座
  cancer: 4, // 巨蟹座
  leo: 5, // 獅子座
  virgo: 6, // 處女座
  libra: 7, // 天秤座
  scorpio: 8, // 天蠍座
  sagittarius: 9 // 射手座
}

// 完整星座資訊（按日期順序排列）
export const ZODIAC_INFO: ZodiacInfo[] = [
  { sign: 'aries', name: '牡羊座', number: 1, dateRange: '3/21 - 4/19' },
  { sign: 'taurus', name: '金牛座', number: 2, dateRange: '4/20 - 5/20' },
  { sign: 'gemini', name: '雙子座', number: 3, dateRange: '5/21 - 6/20' },
  { sign: 'cancer', name: '巨蟹座', number: 4, dateRange: '6/21 - 7/22' },
  { sign: 'leo', name: '獅子座', number: 5, dateRange: '7/23 - 8/22' },
  { sign: 'virgo', name: '處女座', number: 6, dateRange: '8/23 - 9/22' },
  { sign: 'libra', name: '天秤座', number: 7, dateRange: '9/23 - 10/22' },
  { sign: 'scorpio', name: '天蠍座', number: 8, dateRange: '10/23 - 11/21' },
  { sign: 'sagittarius', name: '射手座', number: 9, dateRange: '11/22 - 12/21' },
  { sign: 'capricorn', name: '摩羯座', number: 1, dateRange: '12/22 - 1/19' },
  { sign: 'aquarius', name: '水瓶座', number: 2, dateRange: '1/20 - 2/18' },
  { sign: 'pisces', name: '雙魚座', number: 3, dateRange: '2/19 - 3/20' }
]

// 星座圖示對應
export const ZODIAC_ICONS: Record<ZodiacSign, string> = {
  aries: 'mdi-zodiac-aries',
  taurus: 'mdi-zodiac-taurus',
  gemini: 'mdi-zodiac-gemini',
  cancer: 'mdi-zodiac-cancer',
  leo: 'mdi-zodiac-leo',
  virgo: 'mdi-zodiac-virgo',
  libra: 'mdi-zodiac-libra',
  scorpio: 'mdi-zodiac-scorpio',
  sagittarius: 'mdi-zodiac-sagittarius',
  capricorn: 'mdi-zodiac-capricorn',
  aquarius: 'mdi-zodiac-aquarius',
  pisces: 'mdi-zodiac-pisces'
}

/**
 * 根據星座取得數字
 */
export function getZodiacNumber(sign: ZodiacSign): number {
  return ZODIAC_NUMBER_MAP[sign]
}

/**
 * 根據星座代碼取得完整資訊
 */
export function getZodiacInfo(sign: ZodiacSign): ZodiacInfo | undefined {
  return ZODIAC_INFO.find((z) => z.sign === sign)
}

/**
 * 根據月日自動推算星座
 */
export function getZodiacByDate(month: number, day: number): ZodiacSign {
  const dateNum = month * 100 + day

  if (dateNum >= 321 && dateNum <= 419) return 'aries'
  if (dateNum >= 420 && dateNum <= 520) return 'taurus'
  if (dateNum >= 521 && dateNum <= 620) return 'gemini'
  if (dateNum >= 621 && dateNum <= 722) return 'cancer'
  if (dateNum >= 723 && dateNum <= 822) return 'leo'
  if (dateNum >= 823 && dateNum <= 922) return 'virgo'
  if (dateNum >= 923 && dateNum <= 1022) return 'libra'
  if (dateNum >= 1023 && dateNum <= 1121) return 'scorpio'
  if (dateNum >= 1122 && dateNum <= 1221) return 'sagittarius'
  if (dateNum >= 1222 || dateNum <= 119) return 'capricorn'
  if (dateNum >= 120 && dateNum <= 218) return 'aquarius'
  return 'pisces'
}
