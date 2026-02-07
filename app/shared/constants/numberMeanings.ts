import type {
  NumberMeaning,
  MissingNumberMeaning,
  TalentNumberMeaning,
  CircleCountMeaning,
  BirthdayNumberMeaning,
  ConditioningNumberMeaning,
  PinnacleNumberMeaning,
  ChallengeNumberMeaning,
  LifeCycleMeaning
} from '~/shared/types'

// 主命數意義
export const NUMBER_MEANINGS: NumberMeaning[] = [
  {
    number: 1,
    name: '開創者',
    keywords: ['領導', '獨立', '創新', '勇氣'],
    description: '數字1代表開創與領導的能量。你是天生的領袖，具有獨立自主的精神和開拓新局的勇氣。你喜歡走在前端，不喜歡受到束縛，總能以自己的方式解決問題。在人群中你常不自覺地成為核心，帶領他人前進。',
    strengths: ['領導能力強', '獨立自主', '勇於創新', '意志堅定'],
    challenges: ['可能過於自我中心', '需要學習傾聽他人', '容易感到孤獨'],
    career: ['企業家', '主管', '專案經理', '創業者', '獨立工作者'],
    relationship: '在感情中你重視自主空間，需要伴侶尊重你的獨立性。你是主動追求型，但要留意不要過於強勢，學習在關係中傾聽與妥協。'
  },
  {
    number: 2,
    name: '合作者',
    keywords: ['合作', '平衡', '敏感', '外交'],
    description: '數字2代表合作與和諧的能量。你擅長在人際關係中找到平衡，是天生的調解者。你有極強的同理心，能夠敏銳地感知他人的情緒和需求。你在團隊中如魚得水，能夠讓每個人都感到被重視。',
    strengths: ['善於合作', '富有同理心', '直覺敏銳', '追求和諧'],
    challenges: ['可能過於依賴他人', '容易優柔寡斷', '需要建立自信'],
    career: ['諮商師', '外交官', '人資專員', '調解員', '護理師', '教師'],
    relationship: '你是天生的伴侶型人格，重視兩人的和諧關係。你願意為對方付出，但要注意不要失去自我，學習表達自己真正的需求。'
  },
  {
    number: 3,
    name: '表達者',
    keywords: ['創意', '表達', '樂觀', '社交'],
    description: '數字3代表創意與表達的能量。你具有藝術天賦，擅長透過各種方式表達自我。你的樂觀開朗感染身邊的人，在社交場合中總是閃耀的焦點。你擁有豐富的想像力和幽默感。',
    strengths: ['創意豐富', '表達能力強', '樂觀開朗', '社交能力佳'],
    challenges: ['可能缺乏專注力', '容易分散精力', '需要落實想法'],
    career: ['藝術家', '作家', '演說家', '行銷企劃', '設計師', '表演者'],
    relationship: '你在感情中充滿浪漫與趣味，擅長用語言和驚喜表達愛意。但需要注意不要只追求新鮮感，學習在穩定中持續經營關係。'
  },
  {
    number: 4,
    name: '建造者',
    keywords: ['穩定', '務實', '紀律', '努力'],
    description: '數字4代表穩定與建設的能量。你是腳踏實地的實踐者，擅長建立穩固的基礎。你做事有條有理，重視細節和規則，是團隊中最可靠的成員。你的毅力和堅持是成功的關鍵。',
    strengths: ['務實可靠', '有紀律性', '工作努力', '注重細節'],
    challenges: ['可能過於固執', '抗拒改變', '需要培養彈性'],
    career: ['工程師', '會計師', '建築師', '專案管理', '技術主管', '研究員'],
    relationship: '你在感情中是忠誠且可靠的伴侶，重視穩定和安全感。你用行動而非言語表達愛，但要注意適時表達情感，不要讓關係變得過於死板。'
  },
  {
    number: 5,
    name: '自由者',
    keywords: ['自由', '冒險', '變化', '多才多藝'],
    description: '數字5代表自由與變化的能量。你渴望探索新事物，具有適應各種環境的能力。你不喜歡被束縛，追求多元的生活體驗。你的好奇心和適應力讓你在任何環境都能如魚得水。',
    strengths: ['適應力強', '多才多藝', '充滿活力', '勇於冒險'],
    challenges: ['可能過於浮躁', '難以安定', '需要學習承諾'],
    career: ['業務', '媒體工作者', '旅遊業', '導遊', '自由接案', '公關'],
    relationship: '你在感情中需要大量的自由空間和新鮮感。你害怕一成不變，會想要和伴侶一起體驗各種事物。但要學習在自由與承諾之間找到平衡。'
  },
  {
    number: 6,
    name: '照顧者',
    keywords: ['責任', '愛', '家庭', '服務'],
    description: '數字6代表愛與責任的能量。你天生具有照顧他人的本能，重視家庭與和諧。你對美和藝術有天生的鑑賞力，擅長營造溫馨的環境。你的存在讓身邊的人感到安心與被愛。',
    strengths: ['富有愛心', '負責任', '重視家庭', '樂於服務'],
    challenges: ['可能過度操心', '容易自我犧牲', '需要照顧自己'],
    career: ['社工', '心理治療師', '教育工作者', '醫護人員', '室內設計師', '廚師'],
    relationship: '你在感情中是無微不至的照顧者，把伴侶和家庭放在第一位。你重視家庭的和諧與完整，但要注意不要過度付出而失去自己，學習讓對方也照顧你。'
  },
  {
    number: 7,
    name: '探索者',
    keywords: ['智慧', '分析', '靈性', '內省'],
    description: '數字7代表智慧與靈性的能量。你是深度思考者，追求真理與內在的成長。你不滿足於表面的答案，總是想要探究事物的本質。你需要獨處的時間來整理思緒和進行內在探索。',
    strengths: ['思維深刻', '分析能力強', '追求真理', '直覺敏銳'],
    challenges: ['可能過於孤僻', '容易懷疑', '需要信任他人'],
    career: ['科學家', '研究員', '數據分析師', '哲學家', '心理學家', '策略顧問'],
    relationship: '你在感情中需要精神層面的連結，不只是表面的相處。你重視獨處的空間，但內心渴望深度的靈魂伴侶。學習打開心扉，信任伴侶。'
  },
  {
    number: 8,
    name: '成就者',
    keywords: ['權力', '成功', '財富', '實現'],
    description: '數字8代表成就與豐盛的能量。你具有強大的執行力，能夠將目標化為現實。你天生具有商業頭腦和管理才能，對物質世界有著深刻的理解。你追求卓越，渴望在世界上留下自己的印記。',
    strengths: ['執行力強', '目標明確', '商業頭腦', '追求卓越'],
    challenges: ['可能過於功利', '工作狂傾向', '需要平衡生活'],
    career: ['企業高管', '金融業', '律師', '投資者', '房地產', '企業主'],
    relationship: '你在感情中會把伴侶視為重要的人生夥伴，願意提供最好的物質條件。但要注意不要用工作逃避情感，學習在事業與感情之間取得平衡。'
  },
  {
    number: 9,
    name: '智者',
    keywords: ['智慧', '博愛', '完成', '奉獻'],
    description: '數字9代表智慧與博愛的能量。你具有寬廣的視野，關心人類整體的福祉。你擁有豐富的人生閱歷和深刻的洞察力，能夠站在更高的角度看待事物。你天生具有感召力，能夠啟發他人。',
    strengths: ['胸懷寬廣', '富有智慧', '樂善好施', '具人道精神'],
    challenges: ['可能過於理想化', '難以落實', '需要接地氣'],
    career: ['教育家', '社會運動者', '作家', '音樂家', '節目主持人', '非營利組織'],
    relationship: '你在感情中帶著大愛的精神，對伴侶包容且慷慨。你重視精神層面的交流，但有時會因太關注外在的世界而忽略身邊最親近的人。'
  },
  {
    number: 11,
    name: '直覺大師',
    keywords: ['直覺', '啟發', '靈性', '敏感'],
    description: '大師數11代表高度的直覺與靈性覺知。你具有啟發他人的天賦，是靈性的引導者。你的直覺力極強，常能預感事物的發展。你承載著比一般人更強的能量，但也面臨更大的挑戰。',
    strengths: ['直覺極強', '靈性敏銳', '具啟發性', '理想主義'],
    challenges: ['可能過於敏感', '承受壓力大', '需要實際行動'],
    career: ['靈性導師', '藝術創作者', '心理諮商', '發明家', '社會改革者'],
    relationship: '你對伴侶有著極高的精神期待，渴望心靈相通的靈魂伴侶。你的敏感度使你能深刻感受對方的情緒，但也容易因過度敏感而受傷。'
  },
  {
    number: 22,
    name: '建築大師',
    keywords: ['願景', '實現', '建設', '掌控'],
    description: '大師數22代表將偉大願景化為現實的能力。你是夢想的建築師，能夠創造持久的成就。你同時具備遠大的理想和務實的執行力，能把宏大的藍圖一步步實現。',
    strengths: ['願景宏大', '實踐能力強', '組織能力佳', '影響深遠'],
    challenges: ['可能壓力過大', '期望過高', '需要耐心'],
    career: ['大型企業領導', '城市規劃師', '國際組織', '科技創業家', '政治家'],
    relationship: '你在感情中是可靠的領航者，會為兩人的未來規劃宏大的藍圖。你需要一個理解你使命感的伴侶，也要學習放下掌控，接受關係中的不完美。'
  },
  {
    number: 33,
    name: '療癒大師',
    keywords: ['愛', '療癒', '奉獻', '慈悲'],
    description: '大師數33代表最高層次的愛與療癒能量。你是眾人的精神導師，具有無私奉獻的精神。你擁有超越常人的慈悲心和療癒天賦，能在他人最需要的時候給予力量。',
    strengths: ['無條件的愛', '療癒能力', '慈悲心腸', '犧牲奉獻'],
    challenges: ['可能自我犧牲過度', '承擔過多', '需要自我關愛'],
    career: ['心靈導師', '療癒師', '慈善事業', '宗教領袖', '藝術治療師'],
    relationship: '你在感情中充滿無條件的愛，對伴侶有著深厚的包容力。你會把對方的需求放在自己前面，但必須學習也接受被愛和照顧。'
  }
]

// 缺數意義
export const MISSING_NUMBER_MEANINGS: MissingNumberMeaning[] = [
  {
    number: 1,
    name: '缺乏自信與獨立',
    description: '可能在自我主張和獨立決策方面較為薄弱，容易依賴他人的意見。',
    suggestion: '練習獨立思考，勇於表達自己的想法，培養領導能力。',
    luckyColor: '紅色',
    crystal: '紅石榴石、紅碧璽',
    essentialOil: '肉桂、薑'
  },
  {
    number: 2,
    name: '缺乏合作與敏感',
    description: '可能在人際互動中較不敏感，難以理解他人的感受和需求。',
    suggestion: '練習傾聽與同理心，學習在團隊中與他人合作。',
    luckyColor: '橘色',
    crystal: '月光石、橙色方解石',
    essentialOil: '茉莉、依蘭'
  },
  {
    number: 3,
    name: '缺乏表達與創意',
    description: '可能在表達自我和創意發揮方面較為受限，難以將想法傳達出去。',
    suggestion: '嘗試各種藝術創作，練習口語表達，培養創意思維。',
    luckyColor: '黃色',
    crystal: '黃水晶、虎眼石',
    essentialOil: '檸檬、佛手柑'
  },
  {
    number: 4,
    name: '缺乏紀律與穩定',
    description: '可能在建立規律和穩定基礎方面較為薄弱，做事較缺乏系統性。',
    suggestion: '建立日常規律，學習制定計畫並堅持執行，培養耐心。',
    luckyColor: '綠色',
    crystal: '綠幽靈、東菱石',
    essentialOil: '雪松、岩蘭草'
  },
  {
    number: 5,
    name: '缺乏變化與適應',
    description: '可能較抗拒改變，在面對新環境或挑戰時感到不安。',
    suggestion: '嘗試新事物，培養冒險精神，學習擁抱變化。',
    luckyColor: '天藍色',
    crystal: '海藍寶、藍紋瑪瑙',
    essentialOil: '尤加利、薄荷'
  },
  {
    number: 6,
    name: '缺乏責任與關懷',
    description: '可能在承擔責任和照顧他人方面較為薄弱，需要培養服務精神。',
    suggestion: '練習關心身邊的人，承擔適當責任，培養愛的能力。',
    luckyColor: '靛藍色',
    crystal: '青金石、藍晶石',
    essentialOil: '玫瑰、天竺葵'
  },
  {
    number: 7,
    name: '缺乏內省與分析',
    description: '可能較少進行深度思考和內在探索，傾向於表面認識事物。',
    suggestion: '培養獨處與反思的習慣，學習深入分析問題，探索靈性層面。',
    luckyColor: '紫色',
    crystal: '紫水晶、舒俱萊石',
    essentialOil: '薰衣草、乳香'
  },
  {
    number: 8,
    name: '缺乏物質掌控力',
    description: '可能在財務管理和目標達成方面較為薄弱，需要加強執行力。',
    suggestion: '設定明確目標，學習財務知識，培養成就導向的心態。',
    luckyColor: '粉紅色',
    crystal: '粉晶、紅紋石',
    essentialOil: '檀香、沒藥'
  },
  {
    number: 9,
    name: '缺乏博愛與寬廣視野',
    description: '可能較專注於個人事務，較少關注更大的社會議題。',
    suggestion: '培養同理心和寬廣視野，參與公益活動，學習放下與完結。',
    luckyColor: '金色',
    crystal: '鈦晶、金髮晶',
    essentialOil: '橙花、白鼠尾草'
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

// 圈數意義（數字出現次數的解讀）
export const CIRCLE_COUNT_MEANINGS: CircleCountMeaning[] = [
  {
    count: 0,
    label: '空缺',
    description: '此數字能量完全缺失，代表此特質是你今生需要學習的課題。'
  },
  {
    count: 1,
    label: '能量不足',
    description: '此數字能量偏弱，雖然具備此特質但不夠明顯，需要有意識地加強。'
  },
  {
    count: 2,
    label: '能量平衡',
    description: '此數字能量適中且平衡，能自然地展現此特質，是最和諧的狀態。'
  },
  {
    count: 3,
    label: '能量充沛',
    description: '此數字能量強大，此特質非常突出，可能成為你最明顯的個性特徵。'
  },
  {
    count: 4,
    label: '能量過剩',
    description: '此數字能量過於強烈，可能導致此特質走向極端，需要有意識地調節和平衡。'
  },
  {
    count: 5,
    label: '能量爆滿',
    description: '此數字能量極度集中，此特質佔據你性格的主導地位，需要特別注意不要失衡。'
  }
]

// 生日數意義
export const BIRTHDAY_NUMBER_MEANINGS: BirthdayNumberMeaning[] = [
  { number: 1, name: '獨立先鋒', description: '你給人的第一印象是自信且獨立的。他人眼中你是有主見、果斷的人，擅長在關鍵時刻做出決定。' },
  { number: 2, name: '親和使者', description: '你給人溫和、好相處的印象。他人感受到你的細膩與體貼，常主動來向你傾訴或尋求建議。' },
  { number: 3, name: '魅力之星', description: '你的外在形象充滿活力與感染力。他人被你的幽默和熱情所吸引，覺得你是社交場合的開心果。' },
  { number: 4, name: '可靠基石', description: '你給人穩重踏實的印象。他人認為你是值得信賴的人，會在需要時找你幫忙或委託重要任務。' },
  { number: 5, name: '多變風采', description: '你給人靈活多變、充滿好奇心的印象。他人覺得你生活多采多姿，和你在一起總有新鮮事發生。' },
  { number: 6, name: '溫暖港灣', description: '你散發著溫暖和關懷的氣質。他人感受到你的包容與愛心，會不自覺地依賴你的照顧和支持。' },
  { number: 7, name: '神秘智者', description: '你給人深沉且有內涵的印象。他人覺得你充滿智慧與神秘感，想要更深入地了解你的想法。' },
  { number: 8, name: '權威氣場', description: '你散發著強大的氣場和自信。他人在你面前感受到一種天然的權威感，認為你是成功與能力的象徵。' },
  { number: 9, name: '博愛長者', description: '你給人寬厚仁慈的印象。他人感受到你的智慧和大愛，覺得你是一個有遠見且值得尊敬的人。' }
]

// 制約數意義
export const CONDITIONING_NUMBER_MEANINGS: ConditioningNumberMeaning[] = [
  { number: 1, name: '獨立制約', description: '你從小被灌輸「要獨立、要堅強」的觀念。這讓你習慣凡事靠自己，但也可能讓你不擅長求助或接受他人的好意。' },
  { number: 2, name: '依附制約', description: '你從小被教導「要配合、要體貼」。這讓你很在意他人的感受，但也可能讓你過度壓抑自己的需求。' },
  { number: 3, name: '表現制約', description: '你從小被期待「要表現好、要開朗」。這讓你擅長展現自我，但也可能讓你害怕展露脆弱的一面。' },
  { number: 4, name: '規矩制約', description: '你從小被要求「要守規矩、要腳踏實地」。這讓你做事認真負責，但也可能讓你對彈性和改變感到不安。' },
  { number: 5, name: '自由制約', description: '你從小在較自由或多變的環境中成長。這讓你適應力強，但也可能讓你難以安定或做出長期承諾。' },
  { number: 6, name: '責任制約', description: '你從小就被賦予照顧他人的角色。這讓你充滿責任感和愛心，但也可能讓你習慣性地忽略自己的需求。' },
  { number: 7, name: '思考制約', description: '你從小被鼓勵「要多想、要分析」。這讓你思維深刻且獨立，但也可能讓你過度分析而難以行動或信任直覺。' },
  { number: 8, name: '成就制約', description: '你從小被灌輸「要成功、要有成就」的價值觀。這讓你目標明確且有野心，但也可能讓你用成就來定義自我價值。' },
  { number: 9, name: '完美制約', description: '你從小被期望「要懂事、要有大愛」。這讓你擁有寬廣的視野和包容心，但也可能讓你不擅長面對自己的負面情緒。' }
]

// 高峰數意義
export const PINNACLE_NUMBER_MEANINGS: PinnacleNumberMeaning[] = [
  { number: 1, name: '獨立開創', description: '此階段主題是獨立與開創。你需要培養自信和領導力，學習獨立面對挑戰，走出自己的道路。' },
  { number: 2, name: '合作學習', description: '此階段主題是合作與耐心。你需要學習與他人協調合作，培養同理心，在關係中找到平衡。' },
  { number: 3, name: '創意表達', description: '此階段主題是表達與創造。你有機會發揮藝術天分，用創意的方式展現自我，享受社交的樂趣。' },
  { number: 4, name: '穩定建設', description: '此階段主題是建立基礎。你需要腳踏實地地工作，建立穩固的根基，這是為未來打底的重要時期。' },
  { number: 5, name: '變化探索', description: '此階段主題是自由與變化。你會經歷許多轉變，需要保持靈活，勇敢擁抱生命中的各種可能性。' },
  { number: 6, name: '家庭責任', description: '此階段主題是愛與責任。你的重心會放在家庭和關係上，需要學習照顧他人同時也照顧自己。' },
  { number: 7, name: '內在探索', description: '此階段主題是反思與成長。你需要花時間獨處、沉思和學習，這是精神層面成長的重要時期。' },
  { number: 8, name: '成就收穫', description: '此階段主題是成就與豐盛。你有機會在事業和財務上取得突破，需要善用領導力和管理才能。' },
  { number: 9, name: '完成奉獻', description: '此階段主題是完成與奉獻。你會以更寬廣的視野看待人生，投入服務社會、幫助他人的行動中。' },
  { number: 11, name: '靈性覺醒', description: '此階段帶有大師數11的特殊能量。你的直覺力會特別強烈，可能經歷靈性上的覺醒與啟發。' },
  { number: 22, name: '宏大建設', description: '此階段帶有大師數22的特殊能量。你有機會實現宏大的目標，將理想轉化為影響深遠的實際成就。' }
]

// 挑戰數意義
export const CHALLENGE_NUMBER_MEANINGS: ChallengeNumberMeaning[] = [
  { number: 0, name: '全面挑戰', description: '你面臨的是綜合性的挑戰，需要在所有面向都保持平衡。這代表你有潛力克服任何困難，但也需要更多的自我覺察。' },
  { number: 1, name: '自信挑戰', description: '你需要克服缺乏自信或過度自我的傾向。學習在獨立與合作之間取得平衡，建立健康的自我認同。' },
  { number: 2, name: '敏感挑戰', description: '你需要克服過度敏感或缺乏耐心的傾向。學習管理情緒，在人際關係中保持自信而不失同理心。' },
  { number: 3, name: '表達挑戰', description: '你需要克服自我懷疑或過度表現的傾向。學習真誠地表達自我，找到創意與務實之間的平衡點。' },
  { number: 4, name: '紀律挑戰', description: '你需要克服逃避責任或過度僵化的傾向。學習建立良好的工作習慣，同時保持靈活和開放的心態。' },
  { number: 5, name: '自由挑戰', description: '你需要克服對自由的恐懼或對改變的抗拒。學習擁抱變化，在穩定與冒險之間找到自己的節奏。' },
  { number: 6, name: '責任挑戰', description: '你需要克服過度干涉或逃避責任的傾向。學習在照顧他人與照顧自己之間取得平衡。' },
  { number: 7, name: '信任挑戰', description: '你需要克服過度懷疑或與世隔絕的傾向。學習信任自己和他人，將分析與直覺結合運用。' },
  { number: 8, name: '權力挑戰', description: '你需要克服對物質的過度追求或對權力的恐懼。學習正確地運用影響力，在物質與精神之間保持平衡。' }
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

/**
 * 取得圈數意義
 */
export function getCircleCountMeaning(count: number): CircleCountMeaning {
  if (count >= CIRCLE_COUNT_MEANINGS.length) {
    return CIRCLE_COUNT_MEANINGS[CIRCLE_COUNT_MEANINGS.length - 1]
  }
  return CIRCLE_COUNT_MEANINGS[count]
}

/**
 * 取得生日數意義
 */
export function getBirthdayNumberMeaning(number: number): BirthdayNumberMeaning | undefined {
  return BIRTHDAY_NUMBER_MEANINGS.find((m) => m.number === number)
}

/**
 * 取得制約數意義
 */
export function getConditioningNumberMeaning(number: number): ConditioningNumberMeaning | undefined {
  return CONDITIONING_NUMBER_MEANINGS.find((m) => m.number === number)
}

/**
 * 取得高峰數意義
 */
export function getPinnacleNumberMeaning(number: number): PinnacleNumberMeaning | undefined {
  return PINNACLE_NUMBER_MEANINGS.find((m) => m.number === number)
}

/**
 * 取得挑戰數意義
 */
export function getChallengeNumberMeaning(number: number): ChallengeNumberMeaning | undefined {
  return CHALLENGE_NUMBER_MEANINGS.find((m) => m.number === number)
}

// 生命週期數意義
export const LIFE_CYCLE_MEANINGS: LifeCycleMeaning[] = [
  { number: 1, name: '獨立與開創', description: '此階段的主題是建立自我認同與獨立性。你需要學習相信自己、培養領導力，勇敢地開創屬於自己的道路。' },
  { number: 2, name: '合作與敏感', description: '此階段的主題是學習與他人建立和諧關係。你需要培養耐心與同理心，在合作中找到自己的位置。' },
  { number: 3, name: '創意與表達', description: '此階段的主題是創造力的發揮與自我表達。你會受到藝術和社交的吸引，需要找到適合的方式展現自我。' },
  { number: 4, name: '穩定與建設', description: '此階段的主題是打好基礎與培養紀律。你需要腳踏實地地工作，建立穩固的生活架構。' },
  { number: 5, name: '自由與探索', description: '此階段的主題是擁抱變化與多元體驗。你會渴望自由和冒險，需要學習在變動中保持核心方向。' },
  { number: 6, name: '愛與責任', description: '此階段的主題是家庭、愛與服務。你需要學習承擔責任、照顧他人，同時也照顧好自己。' },
  { number: 7, name: '內省與智慧', description: '此階段的主題是向內探索與追求智慧。你需要花時間獨處、思考與學習，深入了解生命的意義。' },
  { number: 8, name: '成就與豐盛', description: '此階段的主題是實現目標與創造物質豐盛。你有機會在事業和財務上取得重大成就。' },
  { number: 9, name: '完成與奉獻', description: '此階段的主題是完成使命與回饋社會。你會以更寬廣的視野看待人生，投入服務與奉獻的行動中。' },
  { number: 11, name: '靈性啟發', description: '此階段帶有大師數11的能量，主題是靈性覺醒與啟發他人。你的直覺力特別強，可能經歷深刻的精神體驗。' },
  { number: 22, name: '宏大實現', description: '此階段帶有大師數22的能量，主題是將遠大理想化為現實。你有機會創造深遠的影響力。' }
]

/**
 * 取得生命週期數意義
 */
export function getLifeCycleMeaning(number: number): LifeCycleMeaning | undefined {
  return LIFE_CYCLE_MEANINGS.find((m) => m.number === number)
}
