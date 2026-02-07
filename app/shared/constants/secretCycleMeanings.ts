import type { SecretCycleMeaning } from '~/shared/types'

export const SECRET_CYCLE_MEANINGS: SecretCycleMeaning[] = [
  { number: 1, name: '內在獨立', description: '不管外在發生什麼，你內心渴望獨立自主與掌控感。這段時期你會更加關注自我成長，想要證明自己的能力。' },
  { number: 2, name: '內在敏感', description: '你的內心變得格外敏感細膩，對人際關係的變化感受特別深。這段時期你需要更多的情感支持與連結。' },
  { number: 3, name: '內在愉悅', description: '不管外在壓力多大，你的內心渴望快樂和創造性的表達。這段時期你會被藝術、音樂和美好事物深深吸引。' },
  { number: 4, name: '內在安穩', description: '你的內心渴望安全感和穩定。這段時期你會格外在意基礎是否穩固，想要為自己打造一個安心的環境。' },
  { number: 5, name: '內在自由', description: '你的內心充滿對自由和變化的渴望。即使外在環境穩定，你內心也會感到躁動，想要突破和探索新事物。' },
  { number: 6, name: '內在關愛', description: '你的內心充滿了對愛與和諧的需求。這段時期你會特別關注家庭關係，渴望給予和接受愛。' },
  { number: 7, name: '內在探索', description: '你的內心渴望獨處和深度思考。這段時期你會想要遠離喧囂，探索內在世界和生命的深層意義。' },
  { number: 8, name: '內在力量', description: '你的內心充滿了對成就和認可的渴望。這段時期你會感受到強大的內在驅動力，想要創造有價值的成果。' },
  { number: 9, name: '內在圓滿', description: '你的內心正在經歷一個完成和放下的過程。這段時期你會以更寬廣的視角看待一切，學習接受和釋懷。' }
]

/**
 * 取得秘密循環數意義
 */
export function getSecretCycleMeaning(number: number): SecretCycleMeaning | undefined {
  return SECRET_CYCLE_MEANINGS.find((m) => m.number === number)
}
