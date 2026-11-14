/**
 * ときどき重なる出来事の場面（engine.ts の CallEvents）
 *
 * - birthday：4回目の100歳の自分が、誕生日をたずねる（教えた誕生日は覚えておき、その日の電話でお祝いを言う。たずねるのはこの1回だけ）
 * - season：季節の節目の日（大晦日・正月・七夕・お盆・誕生日）
 * - longago：前の電話から30日以上あいた
 * - milestone：節目の回（50・100・200…回目）。これまでの電話を振り返る
 * - capsule：タイムカプセル。1年後の自分へのひとことを残す（1年後にアプリを開くと届く）
 * 真夜中の電話はここではなく、sky の最初のひとこと（script.ts）。混線は Call.tsx の最初。
 *
 * テンポを崩さないよう、どれも1往復だけ。
 */
import type { CallContext } from './engine'
import { ag, me, t, type Variant } from './text'
import type { StoryNode } from './script'

/** 「03-14」→「3月14日」 */
export function monthDayLabel(v: string): string {
  const [m, d] = v.split('-').map(Number)
  return m && d ? `${m}月${d}日` : ''
}

/** 天気のあと：誕生日をたずねる → 季節の節目 → いつもの「今日はどんな一日」 */
export const afterSky = (c: CallContext) => (c.ev?.askBirthday ? 'birthday' : afterBirthday(c))
const afterBirthday = (c: CallContext) => (c.ev?.season && seasonFits(c) ? 'season' : 'day')
/** 誕生日のお祝いは、自分（未来・過去・100年後）だけ。子孫と親は、季節の行事だけ */
const seasonFits = (c: CallContext) => c.ev?.season !== 'birthday' || (c.tier !== 'kin' && c.tier !== 'parent')

/** 「元気だった？」「今日もつながったね」のあと：久しぶり → 節目の振り返り → いつもの続き */
export const afterGreeting = (rest: string) => (c: CallContext) => (c.ev?.longAgoDays ? 'longago' : afterLongAgo(rest)(c))
const afterLongAgo = (rest: string) => (c: CallContext) => (c.ev?.milestone ? 'milestone' : rest)

/** 「懐かしむ」場面のあと：タイムカプセル → カードの残りわずか */
export const afterNowscape = (c: CallContext) => (c.ev?.capsule ? 'capsule' : 'lowcard')

const SEASON: Record<string, { say: (c: CallContext) => Variant[]; choices: { label: ReturnType<typeof me> | string; value: string; reply: Variant[] }[] }> = {
  nye: {
    say: () => [
      ag(t('そういえば、そっちは大晦日{だね}。', undefined, '……そうか、そっちは大晦日かい。', 'そっちは、大晦日なんだ{ね}。'), { kin: 'そっちは、大晦日なんだ{ね}。', parent: '今日は、大晦日{だね}。' }),
      ag(t('今年は、どんな一年だった？', undefined, '今年は、どんな一年だったかい。'), { ninety: '……今年は、どんな一年だった？' }),
    ],
    choices: [
      { label: me('いい一年だった', undefined, 'いい一年だったよ', 'わりといい年だった！'), value: 'good', reply: [t('{いい}{ね}。……その一年、こっちからは、ぜんぶ懐かしい{よ}。', undefined, 'それは{いい}{ね}。……あの年のこと、よく覚え{てる}{よ}。')] },
      { label: me('いろいろあった一年だった', undefined, 'いろいろあったなあ', 'いやー、いろいろあった'), value: 'mixed', reply: [t('いろいろあった年ほど、あとで思い出すもん{だよ}。……おつかれさま。', undefined, 'いろいろあった年ほど、あとで愛おしくなる{よ}。……おつかれさま。')] },
    ],
  },
  newyear: {
    say: () => [
      ag(t('あけましておめでとう。……そっちは、お正月{だね}。', undefined, 'あけましておめでとう。……そっちは、お正月かい。'), { kin: 'あけましておめでとう。……昔のお正月って、どんなだったんだろう。', parent: 'あけましておめでとう。……{いい}年に、なるといい{ね}。' }),
      t('今年は、どんな年にしたい？', undefined, '今年は、どんな年にしたいかい。'),
    ],
    choices: [
      { label: me('のんびり過ごしたい', undefined, 'のんびりしたいな', 'のんびりしたい！'), value: 'slow', reply: [t('{いい}{ね}。のんびりした日ほど、あとで懐かしくなる{よ}。')] },
      { label: me('何か新しいことを始めたい', undefined, '何か新しいこと始めたい', '新しいこと始めたい！'), value: 'new', reply: [t('{いい}{ね}。……始めた日のこと、こっちはちゃんと覚え{てる}{よ}。', undefined, '{いい}{ね}。……始めた日のことは、ずっと覚え{てる}もん{だよ}。')] },
    ],
  },
  tanabata: {
    say: () => [
      ag(t('今日は、七夕{だね}。', undefined, '今日は、七夕かい。'), { kin: '今日は、七夕{だね}。……昔も、短冊を飾ってたんだ{ね}。' }),
      t('短冊に、何か願いごと書いた？', undefined, '短冊には、何か書いたかい。'),
    ],
    choices: [
      { label: me('書いたよ', undefined, '書いた書いた', '書いたよ、ひみつだけど'), value: 'wrote', reply: [t('ふふ、そっか。……その願い、こっちでは、どうなったと思う？ ……ひみつ{だよ}。', undefined, 'そうかい。……あの頃の願いごと、なんだか懐かしい{ね}。')] },
      { label: me('書いてないかも', undefined, '書いてないや', 'まだ書いてない'), value: 'notyet', reply: [t('じゃあ、心の中で、ひとつだけ。……こっちで、こっそり覚えておく{から}。', undefined, 'それなら、心の中でひとつ。……こっちで覚えておく{よ}。')] },
    ],
  },
  obon: {
    say: () => [
      ag(t('そっちは、お盆{だね}。', undefined, 'そっちは、お盆かい。……迎え火の匂いが、懐かしい{ね}。'), { kin: 'そっちは、お盆{だね}。……ご先祖さまが、帰ってくる日。', parent: 'もうすぐ、お盆{だね}。' }),
      ag(t('誰かのこと、思い出したりしてる？', undefined, '誰かのことを、思い出したりしてるかい。'), { kin: '……こっちは今、ご先祖さまと話してるのかも{ね}。ふふ。' }),
    ],
    choices: [
      { label: me('少しだけ', undefined, 'ちょっとだけ', 'ちょっとね'), value: 'some', reply: [t('うん。……思い出してもらえるのは、うれしいこと{だよ}。', undefined, 'うん。……思い出すことも、ひとつの会いかた{だよ}。')] },
      { label: me('家族で集まってる', undefined, '家族で集まってるよ', 'みんな集まってる！'), value: 'family', reply: [t('{いい}{ね}。……その賑やかな声、こっちからは、ずいぶん懐かしい{よ}。')] },
    ],
  },
  birthday: {
    say: (c) => [
      t(`……そういえば、今日は${c.name}の誕生日{だね}。`, undefined, `……今日は、${c.name}の誕生日{だね}。ちゃんと覚え{てる}{よ}。`, '……今日は、そっちの誕生日{だね}。'),
      t('おめでとう。……そっちの一年が、またひとつ始まる{ね}。', undefined, 'おめでとう。……あの誕生日のことも、今では懐かしい{よ}。', 'おめでとう。……未来の自分の誕生日、なんだか不思議。', 'おめでとう。……100年たっても、この日は特別{だよ}。'),
    ],
    choices: [
      { label: me('ありがとう', undefined, 'ありがと！', 'ありがとね！'), value: 'thanks', reply: [t('ふふ。……誰かに祝ってもらった誕生日は、ずっと覚え{てる}もん{だよ}。')] },
      { label: me('覚えててくれたんだ', undefined, '覚えてたんだ', 'よく覚えてたね'), value: 'remember', reply: [t('自分の誕生日{だから}{ね}。……忘れるわけない。', undefined, 'ちゃんと覚え{てる}{よ}。……前に、教えてもらった{から}{ね}。')] },
    ],
  },
}

export const EVENT_NODES: Record<string, StoryNode> = {
  /** 4回目：100歳の自分が、誕生日をたずねる（教えてくれたら覚えておく。たずねるのはこの1回だけ） */
  birthday: {
    id: 'birthday',
    question: '誕生日',
    say: (c) => [
      t('……そうだ、ひとつ聞いてもいいかい？'),
      t(`この歳になると、自分の誕生日さえ、あやふやになって{ね}。……${c.name}の誕生日、教えてくれる？`),
    ],
    input: { key: 'birthday', prompt: '誕生日（言わなくても大丈夫）', placeholder: '', maxLength: 5, kind: 'monthday' },
    inputReply: (v) =>
      v
        ? [t(`${monthDayLabel(v)}……。そうだった、そうだった。……もう、忘れない。その日になったら、また思い出す{から}{ね}。`)]
        : [t('……いい{よ}。いつか、ふと思い出す{から}。')],
    next: afterBirthday,
  },

  season: {
    id: 'season',
    question: '季節の節目の日',
    answerKey: 'season',
    say: (c) => SEASON[c.ev?.season ?? 'nye'].say(c),
    choices: (c) => SEASON[c.ev?.season ?? 'nye'].choices,
    next: 'day',
  },

  longago: {
    id: 'longago',
    question: '久しぶりの電話',
    answerKey: 'longago',
    say: (c) => [
      ag(t(`……前の電話から、${c.ev?.longAgoDays}日。久しぶり{だね}。`, undefined, `……前の電話から、${c.ev?.longAgoDays}日かい。久しぶり{だね}。`), { ninety: `……${c.ev?.longAgoDays}日ぶり、か。……久しぶり{だね}。` }),
      t('ずっと、声が聞きたいなって思っ{てた}{よ}。', undefined, 'しばらく声が聞けなくて、少しさみしかった{よ}。'),
    ],
    choices: () => [
      { label: me('ごめん、ちょっとバタバタしてて', undefined, 'ごめん、バタバタしてて', 'ごめーん、忙しくてさ'), value: 'busy', reply: [t('ううん。忙しかった日々も、あとで懐かしくなる{から}。……今日は、ゆっくり話そう{ね}。')] },
      { label: me('こっちも、話したかった', undefined, 'こっちも話したかった', '話したかったよ'), value: 'missed', reply: [t('……うん。ありがとう。今日は、いつもより少し長く話そう{ね}。', undefined, '……そうかい。うれしい{よ}。今日は、ゆっくり話そう{ね}。')] },
    ],
    next: (c) => (c.script === 'second' ? afterLongAgo('memo2')(c) : afterLongAgo('sky')(c)),
  },

  milestone: {
    id: 'milestone',
    question: '節目の電話',
    answerKey: 'milestone',
    say: (c) => {
      const m = c.ev?.milestone
      if (!m) return []
      const words = m.words.length ? [t(`「${m.words.join('」「')}」……ぜんぶ、覚え{てる}{よ}。`)] : []
      return [
        t(`……ねえ。最初の電話は、${m.firstDate}だった{ね}。`),
        t(`あれから${m.days}日。君の時代からすると、${m.n}回も話したん{だね}。`),
        ...words,
        t('重ねてきた電話のひとつひとつが、こっちの宝物{だよ}。'),
      ]
    },
    choices: () => [
      { label: me('そんなに話してたんだね', undefined, 'そんなに話してたんだ', 'めっちゃ話したね'), value: 'many', reply: [t('うん。……どの電話も、今では懐かしい思い出{だよ}。')] },
      { label: me('これからも、よろしくね', undefined, 'これからもよろしく', 'これからもよろしくね！'), value: 'more', reply: [t('こちらこそ。……次の電話も、いつか懐かしくなるん{だよ}。')] },
    ],
    next: 'sky',
  },

  /** タイムカプセル：1年後の自分へのひとこと（1年後にアプリを開くと届く） */
  capsule: {
    id: 'capsule',
    question: '1年後の自分へ',
    say: () => [
      ag(t('そうだ。……1年後のそっちに、ひとこと残してみない？', undefined, 'そうだ。……1年後のそっちに、ひとこと残してごらん。'), { kin: 'そうだ。……1年後のそっちに、ひとこと残してみない？' }),
      t('こっちからは届けられないけど、そのカードが、覚えておいてくれる{から}。'),
    ],
    input: { key: 'capsule', prompt: '1年後の自分へ（書かなくても大丈夫）', placeholder: '例：まだあの店に通ってる？', maxLength: 60 },
    inputReply: (v) => (v ? [t('うん。……1年後のそっちに、ちゃんと届く{よ}。')] : [t('うん。また今度で{いい}{よ}。')]),
    next: 'lowcard',
  },
}

/** 真夜中（2〜4時）の電話の、最初のひとこと */
export const MIDNIGHT: Variant = ag(
  t('……ふぁ。こんな夜中に、どうしたの？ ……眠れない？', undefined, '……おや、こんな夜更けに。……眠れないのかい。', '……こんな夜中に、未来の自分も起きてるんだ。', '……こんな夜更けに。……眠れないのかい。'),
  { kin: '……こんな夜中に、昔からの電話。……眠れないの？', parent: '……こんな夜中に。……眠れないの？' },
)
/** 真夜中の電話の、最後のひとこと */
export const MIDNIGHT_BYE: Variant = t('……もう遅い{から}、あたたかくして寝て{ね}。', undefined, '……もう遅い。あたたかくして、おやすみ。')
