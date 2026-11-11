/**
 * 会話シナリオ（分岐型）
 *
 * 作品の核：
 *   「懐かしむ」という、本来は過去に対してしかできないことを、現在進行形で体験する。
 *   未来の自分は、プレイヤーの「今」を、すでに懐かしい思い出として語る。
 *
 * 電話の相手は、10〜60年後の自分（通話ごとにランダム）。話し方は年代で3段階。
 * 履歴が10件たまるごとに、次の1回だけ「10年前の自分」か「100年後の自分」になる（特別）。
 *   - 10年前の自分：視点が逆。未来の自分（プレイヤー）に、「そっちから見たら、こっちは懐かしいのかな」と話しかける。
 *   - 100年後の自分：遠くから届くような、静かな話し方。
 * 方言は、共通語の台詞に {だよ} などの差し替え部分を入れ、県ごとに置き換える（data/dialects.ts）。
 *
 * 台詞は t(10年後, 20〜30年後, 40〜60年後, 10年前, 100年後)。省略した年代は近い年代の台詞を使う。
 * 長さの目安：往復は10〜11回。返事は、原則1〜2文。
 *
 * 書き方のルール
 * - 未来の出来事は断定しない。人間関係が失われると決めつけない。説教や押しつけにしない。
 * - 一人称はなるべく使わない（性別を推測しないため）。
 *
 * ※ 会話の全文と分岐数は仕様上「未確定」。差し替え前提の稿。
 */
import type { CallContext } from './engine'
import { t, type Text, type Variant } from './text'
import { TOPICS } from './topics'
import { finalMessage } from './finals'

export type { Text, Variant } from './text'
export { t } from './text'
export { finalMessage, feelingCategory } from './finals'
export { recallFor, RECALL_CHANCE } from './recall'

export interface Choice {
  label: Text
  value: string
  /** 選んだあとに未来の自分が返す言葉 */
  reply?: Variant[]
  next?: string
}

export interface InputDef {
  key: string
  prompt: string
  placeholder: string
  maxLength: number
}

export interface StoryNode {
  id: string
  /** 未来の自分の台詞（順番に表示） */
  say?: (c: CallContext) => Variant[]
  /** 記録用の質問文（通話履歴に保存される） */
  question?: string | ((c: CallContext) => string)
  answerKey?: string
  choices?: (c: CallContext) => Choice[]
  input?: InputDef | ((c: CallContext) => InputDef)
  /** 自由入力のあとの返答 */
  inputReply?: (value: string, c: CallContext) => Variant[]
  next?: string
  /** 特別な演出 */
  effect?: 'voice' | 'lowcard' | 'final' | 'listen'
}

/** 名乗ったあとの「なぜ電話したのか」（作品の核を最初に手渡す） */
const WHY = (c: CallContext): Variant[] => [
  t(
    'そっちの「今日」の声が、聞きたくなって。',
    undefined,
    'この歳になると、昔のことばかり思い出して{ね}。',
    'どうしても、未来の自分の声が聞いてみたくて。',
    '100年たっても、そっちの「今日」のことは、ふと思い出す{よ}。',
  ),
  t(
    'こっちからは、そっちの毎日が、もう懐かしい思い出なん{だよ}。',
    `${c.years}年たつと、そっちの毎日は、もう懐かしい思い出なん{だよ}。`,
    `${c.years}年前の毎日は、こっちからは、もうずいぶん懐かしいん{だよ}。`,
    'そっちから見たら、こっちの毎日って、もう懐かしいのかな。',
    '何でもない一日ほど、遠くから見ると、光って見えるん{だよ}。',
  ),
]

export const NODES: Record<string, StoryNode> = {
  open: {
    id: 'open',
    effect: 'voice',
    say: () => [t('もしもし？')],
    choices: () => [
      {
        label: '……もしもし？',
        value: 'hello',
        reply: [t('あ、つながった。よかった。', '……ああ、つながった。よかった。', '……ああ、つながった{ね}。よかった。', 'あ……本当に、つながった。', '……ああ、届いた{ね}。')],
      },
      {
        label: 'どなたですか？',
        value: 'who',
        reply: [t('あ、急にごめん{ね}。', 'ああ、急にごめん{ね}。', 'ああ、急にごめんなさい{ね}。', 'あ、ごめん。びっくりさせちゃった{ね}。', 'ああ、驚かせてしまった{ね}。')],
      },
    ],
    next: 'intro',
  },

  intro: {
    id: 'intro',
    say: (c) => [
      t(`${c.name}、{でしょ}？`, `${c.name}、{でしょ}。`, `${c.name}……{だね}。`, `${c.name}……{でしょ}？`, `${c.name}……{だね}。`),
      t(
        `こっちは${c.years}年後の${c.name}。未来のあなた{だよ}。`,
        undefined,
        `こっちは${c.years}年後の${c.name}。ずっと先の、あなた{だよ}。`,
        `こっちは、10年前の${c.name}。……そっちは、10年後の自分なんだよね？`,
        `こっちは、100年後の${c.name}。……ずいぶん、遠くから話してる{よ}。`,
      ),
    ],
    choices: (c) => [
      { label: 'え、本当に？', value: 'really', reply: WHY(c) },
      {
        label: 'いたずら電話？',
        value: 'prank',
        reply: [t('ふふ、そう思うよ{ね}。', undefined, 'ふふ、そう思うだろう{ね}。', 'いたずらじゃない{よ}。ちゃんと、10年前の自分。'), ...WHY(c).slice(1)],
      },
    ],
    next: 'sky',
  },

  /** 天気にひとこと触れて、そのまま「今日」の話へ（選択肢なし） */
  sky: {
    id: 'sky',
    say: (c) => {
      const w = c.weather
      if (!w) return [t('そっちの空は見えないけど……なんだか懐かしい気がする。', undefined, 'そっちの空は見えないけど、懐かしい空なんだろう{ね}。', 'そっちは、どんな空？ ……こっちからは、見えないや。')]
      if (w.kind === 'rain') return [t('雨の音がする。……この音、懐かしい。', undefined, '雨の音がする{ね}。……{いい}音{だね}。', 'そっちは雨なんだ。……10年後も、雨の音は同じなんだ{ね}。')]
      if (w.kind === 'thunder') return [t('雷、すごい{ね}。窓、閉めておいて{ね}。', undefined, '雷が鳴ってる{ね}。窓は閉めておいて{ね}。', '雷、すごい{ね}。……ちょっとこわい。')]
      if (w.kind === 'snow') return [t('雪{だね}。……この静けさ、懐かしい。', undefined, '雪{だね}。……あたたかくして{ね}。', '雪{だね}。……10年後も、雪の日は静かなんだ。')]
      if (w.kind === 'clear' && w.isDay) return [t('鳥の声がする。……{すごく}懐かしい。', undefined, '鳥の声が聞こえる{ね}。……ああ、懐かしい。', '鳥の声がする。……そっちも、晴れてる？')]
      if (w.kind === 'clear') return [t('虫の声が聞こえる。……この夜、知っ{てる}気がする。', undefined, '虫の声が聞こえる{ね}。こういう夜を、いくつも過ごしてきた{よ}。', '虫の声が聞こえる。……10年後の夜も、こんな感じなんだ。')]
      return [t('静かな空気{だね}。……こういう日、あった気がする。', undefined, '静かな日{だね}。こういう日のことも、覚え{てる}もん{だよ}。', '静かな空気{だね}。……そっちも、くもり？')]
    },
    next: 'day',
  },

  day: {
    id: 'day',
    question: '今日はどんな一日だった？',
    answerKey: 'day',
    say: () => [t('今日って、どんな一日だった？', undefined, '今日は、どんな一日だったかい。', 'ねえ、今日はどんな一日だった？')],
    choices: () => [
      {
        label: 'いつも通りの、普通の日',
        value: 'ordinary',
        reply: [
          t(
            '普通の日、か。……それが、あとで一番懐かしくなるん{だよ}。',
            undefined,
            '普通の日が、いちばんなん{だよ}。あとになるほど、懐かしい。',
            '普通の日、か。……10年後にも普通の日があるって、なんだかほっとする。',
          ),
        ],
      },
      {
        label: 'ちょっと忙しかった',
        value: 'busy',
        reply: [t('おつかれさま。必死だった日って、あとで愛おしくなる{よ}。', undefined, 'おつかれさま。忙しかった日も、今は愛おしい{よ}。', 'そっか。……がんばってるん{だね}、未来の自分。')],
      },
      {
        label: 'あんまりいい日じゃなかった',
        value: 'bad',
        reply: [t('そっか。無理に明るくしなくていい{から}{ね}。', undefined, 'そうかい。今日は、ゆっくりおやすみ。', 'そっか……。それでも、電話に出てくれてうれしい{よ}。')],
      },
      {
        label: 'けっこういい日だった',
        value: 'good',
        reply: [t('{いい}{ね}。声がちょっと明るい。', undefined, 'それはよかった。声が弾んでる{ね}。', 'よかった。……10年後にも、いい日があるんだ{ね}。')],
      },
    ],
    next: 'topic',
  },

  /** 「最近の◯◯」枠：通話ごとに、topics.ts の話題から1つがランダムで入る（形と往復の数は同じ） */
  topic: {
    id: 'topic',
    question: (c) => TOPICS[c.topic].question,
    answerKey: 'topicYN',
    say: (c) => [TOPICS[c.topic].ask],
    choices: (c) => [{ label: 'あるよ', value: 'yes', next: 'topicInput' }, ...TOPICS[c.topic].others],
    next: 'people',
  },

  topicInput: {
    id: 'topicInput',
    question: (c) => TOPICS[c.topic].input.question,
    input: (c) => ({ key: 'topicText', prompt: TOPICS[c.topic].input.prompt, placeholder: TOPICS[c.topic].input.placeholder, maxLength: 20 }),
    inputReply: (value, c) => TOPICS[c.topic].inputReply(value),
    next: 'people',
  },

  people: {
    id: 'people',
    question: '最近、よく話す人は？',
    answerKey: 'people',
    say: () => [t('最近、よく話す人っている？', undefined, '最近、よく話す人は、いるかい。', '最近、よく話す人っている？')],
    choices: (c) => [
      {
        label: '家族',
        value: 'family',
        reply: [t('家族か。何気ない会話ほど、あとで懐かしくなる{よ}。', undefined, '家族とのなんでもない話は、あとでありがたく思うもん{だよ}。', '家族か。……こっちも今日、少し話してみようかな。')],
      },
      {
        label: '友だち',
        value: 'friend',
        reply: [t('{いい}{ね}。どうでもいい話ができる時間って、宝物{だよ}。', undefined, '他愛もない話ができる相手がいるのは、幸せなこと{だよ}。', '友だちか。{いい}{ね}。……なんだか、ほっとした。')],
      },
      {
        label: c.lifestage === 'student' ? '学校の人' : c.lifestage === 'worker' ? '職場の人' : 'まわりの人',
        value: 'peer',
        reply: [t('毎日会う「いつもの顔」って、あとで懐かしくなる{よ}。', undefined, '毎日顔を合わせる人のことは、ふと思い出すもん{だよ}。', '毎日会う人がいるんだ{ね}。……どんな人なんだろう。')],
      },
      {
        label: 'ひとりの時間が多いかな',
        value: 'alone',
        reply: [t(`ひとりの時間も、ちゃんと${c.name}の時間{だよ}。`, undefined, 'ひとりで考えていたことも、あとで大事な思い出になる{よ}。', `ひとりの時間か。……ひとりでも、ちゃんと${c.name}{だよ}。`)],
      },
    ],
    next: 'mood',
  },

  mood: {
    id: 'mood',
    question: '今日の気持ちをひとことで',
    answerKey: 'mood',
    say: () => [t('今日の気持ち、ひとことで言うなら？', undefined, '今日の気持ちを、ひとことで言うと？', '今日の気持ち、ひとことで言うなら？')],
    choices: () => [
      { label: 'おだやか', value: 'calm', reply: [t('おだやか、か。{いい}{ね}。', undefined, 'それは何より{だよ}。', 'おだやか、か。……未来の自分がそう言ってくれて、うれしい。')] },
      { label: 'ちょっと疲れた', value: 'tired', reply: [t('疲れたって言えるの、大事{だよ}。', undefined, '疲れた日は、早めに休むん{だよ}。', 'そっか。……無理しないで{ね}。')] },
      { label: 'なんとなく不安', value: 'anxious', reply: [t('そっか。不安な夜って、長く感じるよ{ね}。', undefined, 'そうかい。そういう夜も、ある{よ}。', 'そっか。……こっちも、不安な日はある{よ}。同じ{だね}。')] },
      { label: 'わくわくしてる', value: 'excited', reply: [t('{いい}{ね}。電話越しでも伝わってくる。', undefined, 'それは{いい}{ね}。こっちまで若返る{よ}。', 'わくわくしてるんだ。……こっちまで、うれしい。')] },
      { label: 'よくわからない', value: 'unsure', reply: [t('ひとことじゃ言えないこと、多いよ{ね}。', undefined, 'それでいいん{だよ}。', 'うん。……こっちも、よくわからない日ばっかり{だよ}。')] },
    ],
    next: 'feeling',
  },

  /** 自分の気持ちを任意で言葉にする欄。最後のメッセージに反映する（カードには本文を載せない） */
  feeling: {
    id: 'feeling',
    question: '今の気持ち（自由記述）',
    say: () => [t('よかったら、今の気持ちを言葉にしてみて。', undefined, 'よかったら、今の気持ちを聞かせて{ね}。', 'よかったら、今の気持ち、教えてくれる？')],
    input: { key: 'feeling', prompt: '今の気持ち（書かなくても大丈夫）', placeholder: '例：明日がちょっと楽しみ', maxLength: 60 },
    inputReply: (value) =>
      value
        ? [t(`「${value}」か。……うん、ちゃんと聞いた{よ}。`, undefined, `「${value}」か。……ちゃんと、聞かせてもらった{よ}。`, `「${value}」か。……ちゃんと覚えておく{よ}。`)]
        : [t('うん。言葉にしなくても大丈夫。', undefined, 'いいん{だよ}。ちゃんと伝わってる{から}。', 'うん、言わなくても大丈夫。')],
    next: 'nowscape',
  },

  /**
   * 作品の核となる場面：今この瞬間を、先回りして懐かしむ。
   * 画面から目を離して、今いる場所の音や光を受けとってもらう（この間だけ環境音を元の大きさに戻す）。
   */
  nowscape: {
    id: 'nowscape',
    effect: 'listen',
    say: () => [
      t('ひとつ、お願いしていい？', undefined, 'ひとつ、お願いがある{よ}。', 'ねえ、ひとつお願いしていい？'),
      t(
        '少しだけ画面から目を離して、まわりを見てみて。音とか、光とか。',
        undefined,
        '少しのあいだ、画面から目を離して、まわりを見てごらん。音や、光を。',
        '少しだけ画面から目を離して、まわりを見てみて。……こっちも、同じことをする{から}。',
      ),
    ],
    choices: () => [{ label: '（まわりを見てみた）', value: 'looked' }],
    next: 'nowscape2',
  },

  nowscape2: {
    id: 'nowscape2',
    question: '今の景色を懐かしむと？',
    answerKey: 'nowscape',
    say: (c) => [
      t('今見たもの、聞こえた音。', undefined, '今見えたもの、聞こえた音。', '今そっちに見えたもの、聞こえた音。'),
      t(
        'こっちからは、全部もう戻れない、懐かしい景色なん{だよ}。',
        `こっちからは、全部${c.years}年前の、もう戻れない景色なん{だよ}。`,
        `${c.years}年も前の、もう二度と戻れない景色なん{だよ}。`,
        'こっちから見たら未来なのに、そっちにとっては、いつか懐かしくなる景色なん{だね}。',
        '100年たつと、それは全部、遠い光みたいに懐かしいん{だよ}。',
      ),
    ],
    choices: (c) => [
      {
        label: '……ちょっと、懐かしい気がした',
        value: 'felt',
        reply: [
          t(
            'それ、こっちが今感じてるのと同じ気持ち。……少しだけ、ずるしちゃった{ね}。',
            undefined,
            `本当は${c.years}年かけて味わう気持ち{だよ}。少しだけ、先に渡しておく{よ}。`,
            '今と、未来と、懐かしさが、ぜんぶ一緒にある感じ{だね}。',
            '100年分の懐かしさを、少しだけ分けておく{よ}。',
          ),
        ],
      },
      {
        label: 'なんか、胸がぎゅっとした',
        value: 'ache',
        reply: [
          t(
            '懐かしいって、少しさみしさに似てるよね。それだけ、今日が大事ってこと。',
            undefined,
            '懐かしさは、少しさみしさに似てるん{だよ}。今日が大事な日だった、しるし{だよ}。',
            'わかる気がする。……こっちも今、ちょっとだけ胸がぎゅっとした。',
            '懐かしさは、遠くなるほど、やさしくなるん{だよ}。',
          ),
        ],
      },
      {
        label: 'よくわからなかった',
        value: 'notyet',
        reply: [
          t(
            'それで{いい}{よ}。いつか、今日の音でふと思い出すかも。',
            undefined,
            'それでいいん{だよ}。いつか、ふと思い出すかもしれない{ね}。',
            'それで{いい}{よ}。……こっちも、まだよくわからない{から}。',
            'いつか、ふと思い出してくれたら、それで十分{だよ}。',
          ),
        ],
      },
    ],
    next: 'lowcard',
  },

  lowcard: {
    id: 'lowcard',
    effect: 'lowcard',
    say: (c) => {
      const f = c.answers.feeling
      return [
        t('あ……カードの残り、少ないみたい。', undefined, 'おや……カードの残りが、少ないみたい{だね}。', 'あ……カードの残り、少ないみたい。', '……そろそろ、声が届かなくなるみたい{だね}。'),
        ...(f
          ? [
              t(
                `さっきの「${f}」……そんな日、確かにあった気がする。`,
                undefined,
                `「${f}」か。……そんな日が、確かにあった{ね}。`,
                `「${f}」……覚えておく{よ}。10年後の自分の言葉。`,
                `「${f}」か。……その言葉、遠くまで持っていく{よ}。`,
              ),
            ]
          : []),
        t('最後に、ひとつだけ。', undefined, '最後に、ひとつだけ言わせて{ね}。', '最後に、ひとつだけ。'),
      ]
    },
    next: 'final',
  },

  final: {
    id: 'final',
    effect: 'final',
    say: (c) => [
      finalMessage(c),
      t(
        `じゃあね、${c.name}。いつか懐かしくなる今日を、よろしく{ね}。`,
        `それじゃあ、${c.name}。いつか懐かしくなる今日を、大事に{ね}。`,
        `それじゃあね、${c.name}。いつか懐かしくなる今日を、どうか大事に{ね}。`,
        `じゃあね、${c.name}。……10年後の自分に会えて、よかった。`,
        `それじゃあね、${c.name}。100年先から、今日のあなたを懐かしく思ってる{よ}。`,
      ),
    ],
    choices: () => [
      { label: 'ありがとう', value: 'thanks', reply: [t('こちらこそ。', undefined, 'こちらこそ、ありがとう{ね}。', 'こっちこそ。……ありがとう。')] },
      { label: 'またね', value: 'bye', reply: [t('うん。また、いつか。', undefined, undefined, 'うん。……また、いつか。')] },
      { label: '（受話器を置く）', value: 'hangup' },
    ],
    next: 'end',
  },
}
