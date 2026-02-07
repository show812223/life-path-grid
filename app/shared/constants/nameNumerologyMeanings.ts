// 畢達哥拉斯字母對照表 A=1...I=9, J=1...R=9, S=1...Z=8
const LETTER_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

export function getLetterValue(letter: string): number {
  return LETTER_VALUES[letter.toUpperCase()] ?? 0
}

export function isVowel(letter: string): boolean {
  return VOWELS.has(letter.toUpperCase())
}

export interface ExpressionMeaning {
  number: number
  name: string
  description: string
}

export const EXPRESSION_MEANINGS: ExpressionMeaning[] = [
  { number: 1, name: '領導者', description: '你天生具備領導力與獨創性，善於開創新局。表達方式直接有力，適合獨立事業或管理職位。' },
  { number: 2, name: '合作者', description: '你擅長協調與合作，是天生的外交官。表達方式溫和細膩，適合團隊合作與諮詢類工作。' },
  { number: 3, name: '表現者', description: '你具有強大的溝通與創造天賦，擅長自我表達。充滿藝術氣息，適合寫作、演講或藝術創作。' },
  { number: 4, name: '建構者', description: '你是腳踏實地的實踐者，做事有條理、有紀律。擅長建立穩固的基礎，適合工程、管理等領域。' },
  { number: 5, name: '自由者', description: '你追求變化與自由，適應力極強。擅長多方面發展，適合旅行、銷售或任何需要靈活應變的工作。' },
  { number: 6, name: '照顧者', description: '你天生具有責任感與關愛之心，是家庭和社群的支柱。擅長照顧他人，適合教育、醫療等領域。' },
  { number: 7, name: '探索者', description: '你具有深刻的分析力與直覺力，喜歡追求真理。擅長研究與深度思考，適合學術或靈性相關領域。' },
  { number: 8, name: '成就者', description: '你具有強大的商業頭腦與組織能力，追求物質與精神的豐盛。擅長管理與決策，適合商業領域。' },
  { number: 9, name: '奉獻者', description: '你具有博愛精神與人道主義傾向，視野寬廣。擅長啟發他人，適合公益、教育或藝術領域。' }
]

export interface SoulUrgeMeaning {
  number: number
  name: string
  description: string
}

export const SOUL_URGE_MEANINGS: SoulUrgeMeaning[] = [
  { number: 1, name: '渴望獨立', description: '你內心深處渴望獨立自主，希望按照自己的方式生活。成為領導者、開拓者是你靈魂的呼喚。' },
  { number: 2, name: '渴望和諧', description: '你內心渴望和平與和諧的關係。愛與被愛、建立深厚的連結是你靈魂最深的需求。' },
  { number: 3, name: '渴望表達', description: '你內心渴望被看見、被聽見，需要創造性的自我表達。快樂、樂觀和社交是你靈魂的養分。' },
  { number: 4, name: '渴望安穩', description: '你內心渴望安全感與秩序。建立穩固的基礎、有條不紊的生活是你靈魂的追求。' },
  { number: 5, name: '渴望自由', description: '你內心渴望自由與冒險，不喜歡被束縛。體驗生命的多樣性是你靈魂最深的渴望。' },
  { number: 6, name: '渴望愛', description: '你內心渴望給予和接受愛，追求家庭的溫暖。照顧他人、創造美好環境是你靈魂的使命。' },
  { number: 7, name: '渴望真理', description: '你內心渴望了解生命的深層意義，追求智慧與靈性成長。獨處與冥想是你靈魂的滋養。' },
  { number: 8, name: '渴望成就', description: '你內心渴望獲得成就與認可，追求物質與精神的豐盛。掌控權力與創造價值是你靈魂的動力。' },
  { number: 9, name: '渴望奉獻', description: '你內心渴望為世界帶來改變，具有博愛精神。服務他人、提升人類意識是你靈魂的使命。' }
]

export interface PersonalityMeaning {
  number: number
  name: string
  description: string
}

export const PERSONALITY_MEANINGS: PersonalityMeaning[] = [
  { number: 1, name: '獨立自信', description: '外在形象給人獨立、自信、有主見的感覺。別人眼中你是一個果斷有力的領導者。' },
  { number: 2, name: '溫和親切', description: '外在形象給人溫和、友善、好相處的感覺。別人眼中你是一個值得信賴的合作夥伴。' },
  { number: 3, name: '活潑開朗', description: '外在形象給人活潑、有趣、充滿魅力的感覺。別人眼中你是社交場合的焦點。' },
  { number: 4, name: '穩重可靠', description: '外在形象給人穩重、可靠、值得信任的感覺。別人眼中你是一個踏實的實踐者。' },
  { number: 5, name: '活力四射', description: '外在形象給人充滿活力、自由奔放的感覺。別人眼中你是一個精彩有趣的冒險家。' },
  { number: 6, name: '溫暖關懷', description: '外在形象給人溫暖、有愛心、負責任的感覺。別人眼中你是一個值得依靠的人。' },
  { number: 7, name: '深沉神秘', description: '外在形象給人神秘、深沉、有智慧的感覺。別人眼中你是一個博學而有深度的人。' },
  { number: 8, name: '強勢幹練', description: '外在形象給人強勢、專業、有能力的感覺。別人眼中你是一個值得尊敬的成功者。' },
  { number: 9, name: '優雅大方', description: '外在形象給人優雅、包容、有格局的感覺。別人眼中你是一個有智慧且慈悲的人。' }
]

export function getExpressionMeaning(num: number) {
  return EXPRESSION_MEANINGS.find(m => m.number === num)
}

export function getSoulUrgeMeaning(num: number) {
  return SOUL_URGE_MEANINGS.find(m => m.number === num)
}

export function getPersonalityMeaning(num: number) {
  return PERSONALITY_MEANINGS.find(m => m.number === num)
}
