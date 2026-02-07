import type { NumberMeaning, MissingNumberMeaning, TalentNumberMeaning } from '~/shared/types'

// 主命數意義
export const NUMBER_MEANINGS: NumberMeaning[] = [
  {
    number: 1,
    name: '開創者',
    keywords: ['領導', '獨立', '創新', '勇氣'],
    description: '數字1代表開創與領導的能量。你是天生的領袖，具有獨立自主的精神和開拓新局的勇氣。',
    strengths: ['領導能力強', '獨立自主', '勇於創新', '意志堅定'],
    challenges: ['可能過於自我中心', '需要學習傾聽他人', '容易感到孤獨']
  },
  {
    number: 2,
    name: '合作者',
    keywords: ['合作', '平衡', '敏感', '外交'],
    description: '數字2代表合作與和諧的能量。你擅長在人際關係中找到平衡，是天生的調解者。',
    strengths: ['善於合作', '富有同理心', '直覺敏銳', '追求和諧'],
    challenges: ['可能過於依賴他人', '容易優柔寡斷', '需要建立自信']
  },
  {
    number: 3,
    name: '表達者',
    keywords: ['創意', '表達', '樂觀', '社交'],
    description: '數字3代表創意與表達的能量。你具有藝術天賦，擅長透過各種方式表達自我。',
    strengths: ['創意豐富', '表達能力強', '樂觀開朗', '社交能力佳'],
    challenges: ['可能缺乏專注力', '容易分散精力', '需要落實想法']
  },
  {
    number: 4,
    name: '建造者',
    keywords: ['穩定', '務實', '紀律', '努力'],
    description: '數字4代表穩定與建設的能量。你是腳踏實地的實踐者，擅長建立穩固的基礎。',
    strengths: ['務實可靠', '有紀律性', '工作努力', '注重細節'],
    challenges: ['可能過於固執', '抗拒改變', '需要培養彈性']
  },
  {
    number: 5,
    name: '自由者',
    keywords: ['自由', '冒險', '變化', '多才多藝'],
    description: '數字5代表自由與變化的能量。你渴望探索新事物，具有適應各種環境的能力。',
    strengths: ['適應力強', '多才多藝', '充滿活力', '勇於冒險'],
    challenges: ['可能過於浮躁', '難以安定', '需要學習承諾']
  },
  {
    number: 6,
    name: '照顧者',
    keywords: ['責任', '愛', '家庭', '服務'],
    description: '數字6代表愛與責任的能量。你天生具有照顧他人的本能，重視家庭與和諧。',
    strengths: ['富有愛心', '負責任', '重視家庭', '樂於服務'],
    challenges: ['可能過度操心', '容易自我犧牲', '需要照顧自己']
  },
  {
    number: 7,
    name: '探索者',
    keywords: ['智慧', '分析', '靈性', '內省'],
    description: '數字7代表智慧與靈性的能量。你是深度思考者，追求真理與內在的成長。',
    strengths: ['思維深刻', '分析能力強', '追求真理', '直覺敏銳'],
    challenges: ['可能過於孤僻', '容易懷疑', '需要信任他人']
  },
  {
    number: 8,
    name: '成就者',
    keywords: ['權力', '成功', '財富', '實現'],
    description: '數字8代表成就與豐盛的能量。你具有強大的執行力，能夠將目標化為現實。',
    strengths: ['執行力強', '目標明確', '商業頭腦', '追求卓越'],
    challenges: ['可能過於功利', '工作狂傾向', '需要平衡生活']
  },
  {
    number: 9,
    name: '智者',
    keywords: ['智慧', '博愛', '完成', '奉獻'],
    description: '數字9代表智慧與博愛的能量。你具有寬廣的視野，關心人類整體的福祉。',
    strengths: ['胸懷寬廣', '富有智慧', '樂善好施', '具人道精神'],
    challenges: ['可能過於理想化', '難以落實', '需要接地氣']
  },
  {
    number: 11,
    name: '直覺大師',
    keywords: ['直覺', '啟發', '靈性', '敏感'],
    description: '大師數11代表高度的直覺與靈性覺知。你具有啟發他人的天賦，是靈性的引導者。',
    strengths: ['直覺極強', '靈性敏銳', '具啟發性', '理想主義'],
    challenges: ['可能過於敏感', '承受壓力大', '需要實際行動']
  },
  {
    number: 22,
    name: '建築大師',
    keywords: ['願景', '實現', '建設', '掌控'],
    description: '大師數22代表將偉大願景化為現實的能力。你是夢想的建築師，能夠創造持久的成就。',
    strengths: ['願景宏大', '實踐能力強', '組織能力佳', '影響深遠'],
    challenges: ['可能壓力過大', '期望過高', '需要耐心']
  },
  {
    number: 33,
    name: '療癒大師',
    keywords: ['愛', '療癒', '奉獻', '慈悲'],
    description: '大師數33代表最高層次的愛與療癒能量。你是眾人的精神導師，具有無私奉獻的精神。',
    strengths: ['無條件的愛', '療癒能力', '慈悲心腸', '犧牲奉獻'],
    challenges: ['可能自我犧牲過度', '承擔過多', '需要自我關愛']
  }
]

// 缺數意義
export const MISSING_NUMBER_MEANINGS: MissingNumberMeaning[] = [
  {
    number: 1,
    name: '缺乏自信與獨立',
    description: '可能在自我主張和獨立決策方面較為薄弱，容易依賴他人的意見。',
    suggestion: '練習獨立思考，勇於表達自己的想法，培養領導能力。'
  },
  {
    number: 2,
    name: '缺乏合作與敏感',
    description: '可能在人際互動中較不敏感，難以理解他人的感受和需求。',
    suggestion: '練習傾聽與同理心，學習在團隊中與他人合作。'
  },
  {
    number: 3,
    name: '缺乏表達與創意',
    description: '可能在表達自我和創意發揮方面較為受限，難以將想法傳達出去。',
    suggestion: '嘗試各種藝術創作，練習口語表達，培養創意思維。'
  },
  {
    number: 4,
    name: '缺乏紀律與穩定',
    description: '可能在建立規律和穩定基礎方面較為薄弱，做事較缺乏系統性。',
    suggestion: '建立日常規律，學習制定計畫並堅持執行，培養耐心。'
  },
  {
    number: 5,
    name: '缺乏變化與適應',
    description: '可能較抗拒改變，在面對新環境或挑戰時感到不安。',
    suggestion: '嘗試新事物，培養冒險精神，學習擁抱變化。'
  },
  {
    number: 6,
    name: '缺乏責任與關懷',
    description: '可能在承擔責任和照顧他人方面較為薄弱，需要培養服務精神。',
    suggestion: '練習關心身邊的人，承擔適當責任，培養愛的能力。'
  },
  {
    number: 7,
    name: '缺乏內省與分析',
    description: '可能較少進行深度思考和內在探索，傾向於表面認識事物。',
    suggestion: '培養獨處與反思的習慣，學習深入分析問題，探索靈性層面。'
  },
  {
    number: 8,
    name: '缺乏物質掌控力',
    description: '可能在財務管理和目標達成方面較為薄弱，需要加強執行力。',
    suggestion: '設定明確目標，學習財務知識，培養成就導向的心態。'
  },
  {
    number: 9,
    name: '缺乏博愛與寬廣視野',
    description: '可能較專注於個人事務，較少關注更大的社會議題。',
    suggestion: '培養同理心和寬廣視野，參與公益活動，學習放下與完結。'
  }
]

// 天賦數意義
export const TALENT_NUMBER_MEANINGS: TalentNumberMeaning[] = [
  {
    number: 1,
    name: '開創天賦',
    description: '你天生具備領導與開創的能力，擅長獨立思考並帶領他人走向新方向。面對未知時，你能展現勇氣與果斷力。',
    talents: ['領導開創', '獨立決策', '果斷行動', '開拓精神']
  },
  {
    number: 2,
    name: '協調天賦',
    description: '你天生擅長感知他人的情緒與需求，具備出色的協調與合作能力。在團隊中，你是不可或缺的潤滑劑。',
    talents: ['人際協調', '細膩敏感', '合作共融', '外交溝通']
  },
  {
    number: 3,
    name: '表達天賦',
    description: '你天生具備豐富的創造力與表達能力，擅長以言語、文字或藝術形式傳遞想法，感染力十足。',
    talents: ['創意表達', '藝術天賦', '語言魅力', '樂觀感染']
  },
  {
    number: 4,
    name: '組織天賦',
    description: '你天生擁有出色的組織與規劃能力，擅長將混亂化為秩序，打造穩固且可靠的基礎架構。',
    talents: ['系統規劃', '務實執行', '嚴謹有序', '穩定建設']
  },
  {
    number: 5,
    name: '應變天賦',
    description: '你天生具備靈活的適應力與敏銳的觀察力，能夠在變化中找到機會，善於應對各種挑戰。',
    talents: ['靈活應變', '多元學習', '冒險探索', '隨機應變']
  },
  {
    number: 6,
    name: '關懷天賦',
    description: '你天生擁有溫暖的關懷與強烈的責任感，擅長照顧他人並營造和諧的環境，是天生的守護者。',
    talents: ['溫暖關懷', '責任承擔', '和諧營造', '療癒陪伴']
  },
  {
    number: 7,
    name: '洞察天賦',
    description: '你天生具備深度的分析力與直覺，擅長透過研究與內省發現事物的本質，追求真理與智慧。',
    talents: ['深度分析', '直覺洞察', '研究探索', '靈性感知']
  },
  {
    number: 8,
    name: '統御天賦',
    description: '你天生擁有掌控全局的能力與強大的執行力，擅長管理資源、達成目標，並創造豐盛的成果。',
    talents: ['資源整合', '目標達成', '權威管理', '豐盛創造']
  },
  {
    number: 9,
    name: '博愛天賦',
    description: '你天生具備寬廣的視野與悲憫之心，擅長以大愛的精神服務他人，為社會帶來正面的影響力。',
    talents: ['寬廣視野', '無私奉獻', '智慧傳承', '人道關懷']
  }
]

/**
 * 根據數字取得天賦數意義
 */
export function getTalentNumberMeaning(number: number): TalentNumberMeaning | undefined {
  return TALENT_NUMBER_MEANINGS.find((m) => m.number === number)
}

/**
 * 根據數字取得意義
 */
export function getNumberMeaning(number: number): NumberMeaning | undefined {
  return NUMBER_MEANINGS.find((m) => m.number === number)
}

/**
 * 根據缺數取得意義
 */
export function getMissingNumberMeaning(number: number): MissingNumberMeaning | undefined {
  return MISSING_NUMBER_MEANINGS.find((m) => m.number === number)
}
