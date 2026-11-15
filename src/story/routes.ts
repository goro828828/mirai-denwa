/**
 * 会話の通し（5種類）
 *
 * 「今日はどんな一日だった？」のあと〜「今の気持ち」の前に入る、会話の中ほど。
 * 毎回同じ話（人の話・笑ったこと）にならないよう、通話の回数で順番に入れ替える（5回続けて同じ通しにはならない）。
 *   1. people：最近笑ったこと → よく話す人 → その人と、もう一歩（script.ts の topic / people / peopleTalk）
 *   2. way：帰り道
 *   3. food：ごはん
 *   4. night：寝る前・夜
 *   5. fav：好きなもの
 * 相手の年代は、これまでどおり毎回ランダム。どの通しにも、年代ごとの話し方を用意する
 * （t(10年後, 20〜30年後, 40〜60年後, 10年前, 100年後) ＋ ag({ 80代, 90代, 子孫, 親 })。80代は省略時 60〜79歳、100年後は省略時 40〜60年後の台詞）。
 *
 * 書き方のルール（script.ts と同じ）
 * - 答えたこと以上のことは決めつけない。励ましや教えより、時間の差を感じさせる言葉で受けとめる。
 * - 「話したくない」「覚えてない」も選べる。
 */
import type { CallContext } from './engine'
import { ag, me, t, type Variant } from './text'
import type { Choice, StoryNode } from './script'

export type RouteKey = 'people' | 'way' | 'food' | 'night' | 'fav'
export const ROUTE_ORDER: RouteKey[] = ['people', 'way', 'food', 'night', 'fav']

/** 何回目の通話か → 会話の通し（1回目は people） */
export function routeFor(callIndex: number): RouteKey {
  return ROUTE_ORDER[(Math.max(1, callIndex) - 1) % ROUTE_ORDER.length]
}

/** 通しの最初の場面 */
const START: Record<string, string> = { people: 'topic', way: 'way1', food: 'food1', night: 'night1', fav: 'fav1' }
export const routeStart = (c: CallContext): string => START[c.route ?? 'people'] ?? 'topic'

/** 次の電話で「この前は◯◯の話をしたね」と言うときの呼び方 */
export const ROUTE_NOUN: Record<string, string> = { way: '帰り道', night: '寝る前のこと', fav: '好きなもの' }

type Follow = { question: string; ask: Variant[]; choices: Choice[] }

const followNode = (id: string, table: (c: CallContext) => Follow): StoryNode => ({
  id,
  question: (c) => table(c).question,
  answerKey: id,
  say: (c) => table(c).ask,
  choices: (c) => table(c).choices,
  next: 'feeling',
})

// ===================== 2. 帰り道 =====================
const WAY_SEEN: Follow = {
  question: '帰り道で、目に入ったものは？',
  ask: [ag(t('帰り道で、なにか目に入ったもの、あった？', undefined, '帰り道で、何か目にとまったものは、あったかい。'), { ninety: '……帰り道で、何か、見えた？', kin: '帰り道で、なにか目に入ったもの、あった？', parent: '帰り道で、なにか見えた？' })],
  choices: [
    {
      label: me('空がきれいだった', undefined, '空がきれいだった', '空、きれいだった'),
      value: 'sky',
      reply: [ag(t('そっか。……その空、こっちからは、もう見られない空なん{だよ}。', undefined, 'そうかい。……同じ空は、二度とない{から}{ね}。'), { kin: 'そっか。……その空、こっちでも見てみたかったな。', parent: 'そっか。……{いい}{ね}、そういうの。' })],
    },
    {
      label: me('いつものお店の明かり', undefined, 'いつもの店の明かり', 'いつもの店の明かりかな'),
      value: 'shop',
      reply: [t('いつもの明かりって、毎日だと気づかないけど、あとで急に思い出したりする{よ}。', undefined, 'いつもの明かりは、毎日だと気づかないもん{だよ}。あとになって、ふと思い出す。')],
    },
    {
      label: me('とくに何も見てなかったかも', undefined, 'とくに何も見てなかった', '何も見てなかったわ'),
      value: 'none',
      reply: [t('ふふ、それが普通だよ{ね}。……いつもの道って、そういうもん{だよ}。')],
    },
  ],
}
const WAY_TRAIN: Follow = {
  question: '電車やバスで、何を考えていた？',
  ask: [ag(t('電車やバスって、ついぼーっとしちゃうよ{ね}。……何考えてた？', undefined, '揺られていると、ぼんやりするもん{だよ}。……何を考えてた？'), { ninety: '……揺られながら、何を、考えてた？', parent: '電車って、ぼーっとしちゃうよ{ね}。何考えてた？' })],
  choices: [
    {
      label: me('何も考えてなかった', undefined, '何も考えてなかった', 'なんも考えてなかった'),
      value: 'blank',
      reply: [t('それが{いい}んだよ{ね}。……何も考えてない時間って、あとからちょっとほしくなる{から}。', undefined, 'それで{いい}んだ{よ}。何も考えない時間も、ちゃんと要るもん{だよ}。')],
    },
    {
      label: me('明日のこと考えてた', undefined, '明日のこと考えてた', '明日のこと考えてた'),
      value: 'tomorrow',
      reply: [ag(t('そっか。……明日のことを考えてた夜って、こっちからは、ちょっと懐かしいん{だよ}。', undefined, 'そうかい。……明日のことを考えながら揺られてた頃が、懐かしい{よ}。'), { kin: 'そっか。……そっちの明日は、こっちの、ずっと昔なんだ{ね}。', parent: 'そっか。……明日、{いい}日になるといい{ね}。' })],
    },
    {
      label: me('ずっとスマホ見てた', undefined, 'ずっとスマホ見てた', 'ずっとスマホ'),
      value: 'phone',
      reply: [t('ふふ、そうだよ{ね}。……こっちも、たぶんそうしてた。', undefined, 'ふふ、そうかい。……みんな、そうやって帰ってた{ね}。')],
    },
  ],
}
const WAY_HOME: Follow = {
  question: '家にいた日は、何をしていた？',
  ask: [ag(t('家にいる日って、何してることが多い？', undefined, '家にいる日は、何をしてることが多いかい。'), { ninety: '……家では、何を、してた？', parent: '家にいる日って、何してるの？' })],
  choices: [
    {
      label: me('一日のんびりしてた', undefined, '一日のんびりしてた', 'ずっとゴロゴロしてた'),
      value: 'rest',
      reply: [ag(t('{いい}{ね}。……そういう日がある毎日って、ちょっとうらやましい{よ}。', undefined, '{いい}{ね}。のんびりできる日は、大事{だよ}。'), { parent: '{いい}{ね}。……のんびりできる日、大事に{ね}。' })],
    },
    {
      label: me('家で、やることやってた', undefined, '家でやることやってた', '家でいろいろやってた'),
      value: 'busy',
      reply: [t('そっか、おつかれさま。……家でがんばってた日も、ちゃんと一日{だね}。')],
    },
    {
      label: me('ちょっと、外に出る気がしなかった', undefined, '外に出る気がしなかった', 'なんか出る気しなかった'),
      value: 'bad',
      reply: [t('うん、そういう日もある{よ}。……出なくても、大丈夫。', undefined, 'そういう日も、ある{よ}。……出なくても、いいん{だよ}。')],
    },
  ],
}

// ===================== 3. ごはん =====================
const FOOD_WITH: Follow = {
  question: '誰かと一緒に食べた？',
  ask: [ag(t('誰かと一緒{だった}？', undefined, '誰かと一緒{だった}かい。'), { ninety: '……ひとりで、食べた？', kin: '誰かと一緒{だった}？', parent: '誰かと一緒{だった}？' })],
  choices: [
    {
      label: me('ひとりで食べた', undefined, 'ひとりで食べた', 'ひとりだった'),
      value: 'alone',
      reply: [t('そっか。……ひとりで食べたごはんも、ちゃんと覚えてたりする{よ}。', undefined, 'そうかい。ひとりで食べたごはんの味も、案外覚えてるもん{だよ}。')],
    },
    {
      label: me('家族と食べた', undefined, '家族と食べた', '家族とだった'),
      value: 'family',
      reply: [ag(t('{いい}{ね}。……そっちでは、まだそれが当たり前なんだ{ね}。', undefined, '{いい}{ね}。……家族で囲む食卓は、あとでいちばん懐かしくなる{よ}。'), { kin: '{いい}{ね}。……昔の食卓って、どんなだったんだろう。', parent: '{いい}{ね}。家族で食べるごはん、大事{だね}。' })],
    },
    {
      label: me('友だちや、誰かと食べた', undefined, '友だちとかと食べた', '友だちと食べた'),
      value: 'friend',
      reply: [t('{いい}{ね}。誰かと食べたごはんって、味より、話したことのほうを覚えてたりするよ{ね}。')],
    },
  ],
}
const FOOD_WANT: Follow = {
  question: '今いちばん食べたいものは？',
  ask: [ag(t('じゃあ、今いちばん食べたいものって、なに？', undefined, 'それなら、今いちばん食べたいものは、何かい。'), { ninety: '……今、何が、食べたい？', parent: 'じゃあ、今いちばん食べたいものって、なに？' })],
  choices: [
    { label: me('あったかいもの', undefined, 'あったかいもの', 'あったかいやつ'), value: 'warm', reply: [t('わかる。……あったかいもの、{いい}よ{ね}。', undefined, 'そうだ{ね}。あったかいものが、いちばん{だよ}。')] },
    { label: me('甘いもの', undefined, '甘いもの', '甘いもの！'), value: 'sweet', reply: [t('ふふ、{いい}{ね}。……そういうの、ちゃんと食べて{ね}。')] },
    { label: me('特にないかな', undefined, '特にないかな', 'とくにないや'), value: 'none', reply: [t('そっか。……でも、何かひとつ、口に入れて{ね}。', undefined, 'そうかい。……でも、少しでいい{から}、食べて{ね}。')] },
  ],
}

// ===================== 4. 夜 =====================
const NIGHT_SCREEN: Follow = {
  question: '寝る前に、何を見ていた？',
  ask: [ag(t('今日は、何見てたの？', undefined, '今日は、何を見ていたんだい。'), { ninety: '……今日は、何を、見てた？' })],
  choices: [
    { label: me('面白いの見て笑ってた', undefined, '面白いの見て笑ってた', 'おもろいの見て笑ってた'), value: 'fun', reply: [t('はは、{いい}{ね}。夜中にひとりで笑ってる時間って、なんか{いい}よ{ね}。')] },
    {
      label: me('なんとなく流し見してた', undefined, 'なんとなく流し見してた', 'なんとなくダラダラ見てた'),
      value: 'scroll',
      reply: [t('わかる。……何見てたかは忘れても、あの部屋の明るさは覚えてたりする{よ}。', undefined, 'そういう夜も、ある{よ}。何を見てたかは忘れても、部屋の明かりは覚えてるもん{だよ}。')],
    },
    { label: me('誰かとやりとりしてた', undefined, '誰かとやりとりしてた', '誰かとやりとりしてた'), value: 'talk', reply: [t('そっか。……夜のやりとりって、ちょっと特別だよ{ね}。')] },
  ],
}
const NIGHT_DREAM: Follow = {
  question: '夢は見る？',
  ask: [ag(t('{いい}夢、見たりする？', undefined, '夢は、見るかい。'), { ninety: '……夢は、見る？' })],
  choices: [
    { label: me('たまに見る', undefined, 'たまに見る', 'たまに見るよ'), value: 'yes', reply: [t('{いい}{ね}。……どんな夢かは、聞かないでおく{ね}。')] },
    { label: me('あんまり覚えて{ない}', undefined, 'あんまり覚えて{ない}', '覚えて{ない}や'), value: 'no', reply: [t('ふふ、そういうもん{だよ}。……覚えてない夢も、ちゃんと見てたんだと思う{よ}。')] },
  ],
}
const NIGHT_AWAKE: Follow = {
  question: '眠れない夜は、何を考えている？',
  ask: [ag(t('眠れない夜って、何考えてる？', undefined, '眠れない夜は、何を考えてるかい。'), { ninety: '……眠れない夜は、何を、考えてる？', parent: '眠れない夜って、何考えてるの？' })],
  choices: [
    {
      label: me('いろいろ考えちゃう', undefined, 'いろいろ考えちゃう', 'いろいろ考えちゃう'),
      value: 'worry',
      reply: [t('うん……。夜って、考えごとが大きくなるよ{ね}。'), t('こうして話してる間だけでも、少し軽くなってたら{いい}な。')],
    },
    { label: me('ぼーっとしてるだけ', undefined, 'ぼーっとしてるだけ', 'ぼーっとしてる'), value: 'nothing', reply: [t('そっか。……ぼーっとしてる夜も、あとから思うと、ちょっと懐かしいん{だよ}。')] },
    { label: me('あんまり話したくないかも', undefined, 'あんまり話したくないかも', 'それはパスで'), value: 'skip', reply: [t('うん、わかった。……話さなくて{いい}{よ}。')] },
  ],
}

// ===================== 5. 好きなもの =====================
const FAV_WITH: Follow = {
  question: '好きなものは、誰かと一緒に楽しんでいる？',
  ask: [ag(t('それって、誰かと一緒に好きなの？ それとも、ひとりで？', undefined, 'それは、誰かと一緒に楽しんでるのかい。それとも、ひとりで？'), { ninety: '……それは、ひとりで？ 誰かと？' })],
  choices: [
    { label: me('誰かと一緒に楽しんでる', undefined, '誰かと一緒に楽しんでる', '友だちとかと一緒に'), value: 'share', reply: [t('{いい}{ね}。……好きなものを一緒に話せる人がいるの、ちょっとうらやましい{よ}。', undefined, '{いい}{ね}。好きなものを分け合える人がいるのは、{いい}もん{だよ}。')] },
    { label: me('ひとりでこっそり', undefined, 'ひとりでこっそり', 'ひとりでこっそり'), value: 'solo', reply: [t('ふふ、{いい}{ね}。……ひとりだけの好きなものって、ちゃんと自分のもの{だね}。')] },
  ],
}
const FAV_OLD: Follow = {
  question: '子どものころ好きだったものを、覚えている？',
  ask: [ag(t('じゃあ、子どものころ好きだったもの、何か覚えてる？', undefined, 'それなら、小さいころ好きだったものは、覚えてるかい。'), { ninety: '……小さいころ好きだったもの、覚えてる？', parent: 'じゃあ、子どものころ好きだったもの、覚えてる？' })],
  choices: [
    { label: me('覚えてる', undefined, '覚えてる', '覚えてる！'), value: 'yes', reply: [t('{いい}{ね}。……覚えてるってことは、それだけ好きだったん{だね}。')] },
    { label: me('あんまり覚えて{ない}', undefined, 'あんまり覚えて{ない}', 'あんま覚えて{ない}'), value: 'no', reply: [t('ふふ、そういうもん{だよ}。……今のことも、いつかそうやって、ぼんやり懐かしくなるのかも{ね}。')] },
  ],
}

export const ROUTE_NODES: Record<string, StoryNode> = {
  // ---- 2. 帰り道 ----
  way1: {
    id: 'way1',
    question: '今日の帰り道は？',
    answerKey: 'way1',
    say: () => [ag(t('ねえ、今日はどうやって帰ってきた？', undefined, '今日は、どうやって帰ってきたかい。'), { eighty: '今日は……どうやって帰ってきたんだい。', ninety: '……今日は、どんな道を、帰ってきた？', kin: 'ねえ、そっちの帰り道って、どんな感じ？', parent: 'ねえ、今日はどうやって帰ってきたの？' })],
    choices: () => [
      { label: me('歩いて帰ってきた', undefined, '歩いて帰ってきた', '歩きだった'), value: 'walk', reply: [t('{いい}{ね}。歩いてると、いろんなものが目に入るよ{ね}。', undefined, '歩くのは{いい}{ね}。足もとの景色まで、よく見える。')] },
      { label: me('電車やバスで帰ってきた', undefined, '電車とかバスで帰ってきた', '電車で帰ってきた'), value: 'train', reply: [t('そっか。……揺られて帰る時間って、{いい}よ{ね}。', undefined, 'そうかい。揺られて帰る時間も、悪くない{よ}。')] },
      { label: me('自転車で帰ってきた', undefined, '自転車で帰ってきた', 'チャリで帰ってきた'), value: 'bike', reply: [t('そっか。……風、気持ちよかった？', undefined, 'そうかい。……風を切って帰る道は、気持ちいい{よ}。')] },
      { label: me('今日は、ほとんど外に出てない', undefined, '今日は外に出てない', '今日は家から出てない'), value: 'home', reply: [t('そっか。そういう日も{いい}{ね}。', undefined, 'そうかい。家にいる日も、{いい}もん{だよ}。')] },
    ],
    next: 'way2',
  },
  way2: followNode('way2', (c) => (c.answers.way1 === 'train' ? WAY_TRAIN : c.answers.way1 === 'home' ? WAY_HOME : WAY_SEEN)),

  // ---- 3. ごはん ----
  food1: {
    id: 'food1',
    question: '今日、何を食べた？',
    answerKey: 'food1',
    say: () => [ag(t('今日、なに食べた？', undefined, '今日は、何を食べたかい。'), { eighty: '今日は……何を食べたかい。', ninety: '……今日は、ちゃんと、食べた？', kin: 'ねえ、そっちで今日、なに食べた？', parent: '今日、なに食べたの？' })],
    choices: () => [
      { label: me('家でごはん食べた', undefined, '家でごはん食べた', '家で食べた'), value: 'home', reply: [t('{いい}{ね}。……家のごはんって、あとで急に食べたくなったりするんだよ{ね}。', undefined, '{いい}{ね}。家のごはんの味は、ずっと覚えてるもん{だよ}。')] },
      { label: me('買ってきたものとか、外で食べた', undefined, '買ったものとか、外で食べた', 'コンビニとか外で'), value: 'buy', reply: [t('そっか。……いつもの店の味って、意外と覚えてるもん{だよ}。')] },
      { label: me('ちゃんと食べてないかも', undefined, 'ちゃんと食べて{ない}かも', 'あんま食べて{ない}かも'), value: 'skip', reply: [t('そっか……。今日は、忙しかった？', undefined, 'そうかい……。忙しかったのかい。')] },
      { label: me('何食べたか、覚えて{ない}', undefined, '何食べたか覚えて{ない}', 'なに食べたっけ'), value: 'forget', reply: [t('ふふ、そういう日もあるよ{ね}。')] },
    ],
    next: 'food2',
  },
  food2: followNode('food2', (c) => (c.answers.food1 === 'home' || c.answers.food1 === 'buy' ? FOOD_WITH : FOOD_WANT)),

  // ---- 4. 夜 ----
  night1: {
    id: 'night1',
    question: '寝る前は、何をしている？',
    answerKey: 'night1',
    say: () => [ag(t('寝る前って、だいたい何してる？', undefined, '寝る前は、だいたい何をしてるかい。'), { eighty: '寝る前は……何をしてるかい。', ninety: '……寝る前は、何を、してる？', kin: 'そっちでは、寝る前って何してる？', parent: '寝る前って、何してるの？' })],
    choices: () => [
      { label: me('スマホ見てることが多い', undefined, 'スマホ見てることが多い', 'ずっとスマホ'), value: 'phone', reply: [t('だよ{ね}。……気づいたら時間たってるやつ{だね}。', undefined, 'そうかい。……気づいたら、夜が更けてるもん{だよ}。')] },
      { label: me('音楽や動画をつけてる', undefined, '音楽とか動画つけてる', '動画とか流してる'), value: 'music', reply: [t('{いい}{ね}。……その頃によく流してたもの、あとでふと思い出したりする{よ}。')] },
      { label: me('すぐ寝ちゃう', undefined, 'すぐ寝ちゃう', '秒で寝る'), value: 'sleep', reply: [t('ふふ、{いい}{ね}。……ちゃんと眠れる夜があるの、{いい}{ね}。', undefined, 'それは{いい}{ね}。よく眠れるのが、いちばん{だよ}。')] },
      { label: me('なかなか眠れ{ない}', undefined, 'なかなか眠れ{ない}', '全然寝れ{ない}'), value: 'cant', reply: [t('そっか。……眠れない夜、あるよ{ね}。', undefined, 'そうかい。……眠れない夜も、あるよ{ね}。')] },
    ],
    next: 'night2',
  },
  night2: followNode('night2', (c) => (c.answers.night1 === 'sleep' ? NIGHT_DREAM : c.answers.night1 === 'cant' ? NIGHT_AWAKE : NIGHT_SCREEN)),

  // ---- 5. 好きなもの ----
  fav1: {
    id: 'fav1',
    question: '最近、ハマっているものは？',
    answerKey: 'fav1',
    say: () => [ag(t('最近、ちょっとハマってるものってある？', undefined, '最近、夢中になっているものは、あるかい。'), { eighty: '最近……好きなものは、あるかい。', ninety: '……最近、好きなものは、ある？', kin: 'そっちで最近、ハマってるものってある？', parent: '最近、好きなものってある？' })],
    choices: () => [
      { label: me('あるよ', undefined, 'ある！', 'あるある、聞いて'), value: 'yes', next: 'favFree' },
      { label: me('まだ探してる途中', undefined, 'まだ探してる途中', 'まだ探し中'), value: 'looking', reply: [t('探してる途中か。……その途中のほうが、あとで懐かしかったりする{よ}。', undefined, '探してる途中、か。迷ってた頃が、いちばん懐かしいもん{だよ}。')] },
      { label: me('特にないかな', undefined, '特にないかな', 'とくにないや'), value: 'none', reply: [t('そっか。……それでも、毎日ちゃんと過ごしてるん{だね}。')] },
      { label: me('言うのは、ちょっと恥ずかしい', undefined, '言うのはちょっと恥ずかしい', 'それは言わんとく'), value: 'secret', reply: [t('ふふ、そっか。……聞かないでおく{ね}。')] },
    ],
    next: 'fav2',
  },
  /** 「あるよ」のあと：何に夢中か（書かなくてもよい） */
  favFree: {
    id: 'favFree',
    question: '何にハマっている？',
    input: { key: 'favText', prompt: 'なにに夢中？（書かなくても大丈夫）', placeholder: '例：夜に聴くラジオ', maxLength: 20 },
    inputReply: (v) =>
      v
        ? [
            ag(t(`「${v}」か。……{いい}{ね}。`, undefined, `「${v}」かい。……{いい}{ね}。`), { parent: `「${v}」か。……{いい}{ね}。` }),
            t('好きなものの話をしてるときの声って、ちょっと明るくなるよ{ね}。', undefined, '好きなものの話をする声は、ちょっと明るくなるもん{だよ}。'),
          ]
        : [t('ふふ、ひみつか。{いい}{よ}。')],
    next: 'fav2',
  },
  fav2: followNode('fav2', (c) => (c.answers.fav1 === 'yes' ? FAV_WITH : FAV_OLD)),
}

/** カードに残す一行（通しの、2つめの答えから） */
export const ROUTE_LINE: Record<string, Variant> = {
  'way2:sky': t('帰り道に見上げた、今日の空。'),
  'way2:shop': t('いつもの明かりの下を、帰った日。'),
  'way2:none': t('いつもの道を、いつも通り帰った日。'),
  'way2:blank': t('ぼーっと揺られて帰った、今日のこと。'),
  'way2:tomorrow': t('明日のことを考えてた、帰り道。'),
  'way2:phone': t('画面を見ながら帰った、なんでもない日。'),
  'way2:rest': t('のんびりできた、家の一日。'),
  'way2:busy': t('家でがんばってた日も、ちゃんと一日。'),
  'way2:bad': t('出かけなかった日も、ちゃんと一日。'),
  'food2:alone': t('ひとりで食べたごはんも、ちゃんと残ってる。'),
  'food2:family': t('いつもの食卓が、いつか懐かしい。'),
  'food2:friend': t('何を食べたかより、誰と食べたか。'),
  'food2:warm': t('あったかいものが恋しかった、今日のこと。'),
  'food2:sweet': t('甘いものが食べたかった、今日のこと。'),
  'food2:none': t('ごはんのことも忘れるくらいの、今日。'),
  'night2:fun': t('夜中にひとりで笑ってた日。'),
  'night2:scroll': t('なんとなく過ぎた夜も、ちゃんと覚えてる。'),
  'night2:talk': t('夜のやりとりも、いつかの思い出。'),
  'night2:yes': t('{いい}夢が、見られますように。'),
  'night2:no': t('覚えてない夢の、その前の夜。'),
  'night2:worry': t('考えごとの夜も、ちゃんと一日。'),
  'night2:nothing': t('ぼーっとしてた夜も、ちゃんと一日。'),
  'night2:skip': t('ここまで話してくれて、ありがとう。'),
  'fav2:share': t('好きなものを、誰かと話せた日。'),
  'fav2:solo': t('ひとりだけの「好き」を、持ってた日。'),
  'fav2:yes': t('小さいころの「好き」を、覚えてた日。'),
  'fav2:no': t('忘れていくことも、いつかの思い出。'),
}

export type { Follow }
