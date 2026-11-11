/**
 * 「最近の◯◯」枠に入る話題（通話ごとにランダムで1つ）
 *
 * どの話題も同じ形：質問 → 3択（「あるよ」なら自由入力 → 返事／それ以外は返事）→ 次へ
 * 会話の往復の数は、話題によらず同じ。返事は短く（1〜2文）。
 * t(10年後, 20〜30年後, 40〜60年後, 10年前, 100年後)。100年後は省略時、40〜60年後の台詞を使う。
 */
import type { CallContext } from './engine'
import { t, type Variant } from './text'

export interface Topic {
  /** 通話履歴に残す質問 */
  question: string
  ask: Variant
  /** 「あるよ」以外の2つの選択肢 */
  others: { label: string; value: string; reply: Variant[] }[]
  input: { prompt: string; placeholder: string; question: string }
  inputReply: (value: string) => Variant[]
  /** 自由入力のあとの振り返り（「確かにそうだった気がする」） */
  recall: (c: CallContext) => Variant
}

const SECRET: Variant[] = [t('ふふ、ひみつか。それも{いい}{ね}。', undefined, 'ふふ、ひみつか。それも{いい}{ね}。', 'ひみつか。……10年後の自分にも、ひみつがあるんだ。')]
const text = (c: CallContext) => c.answers.topicText ?? ''

export const TOPICS: Record<string, Topic> = {
  food: {
    question: '最近「おいしい」って思ったもの、ある？',
    ask: t('最近、「おいしい」って思ったもの、ある？', undefined, '最近、おいしいと思ったものは、あるかい。'),
    others: [
      {
        label: '思い出せないかも',
        value: 'forget',
        reply: [
          t(
            '毎日食べてるのに{ね}。今日は一口だけ、ちゃんと味わってみて。',
            undefined,
            'ひとつでいい、ゆっくり味わってごらん。あとで思い出すのは、そういう味{だよ}。',
            'そっか。……こっちは今日食べたもの、覚えておこうかな。',
          ),
        ],
      },
      {
        label: '最近、ちゃんと食べてないかも',
        value: 'rushed',
        reply: [t('温かいもの、ひとつでいい{から}{ね}。', undefined, '温かいものを、ひとつでいい{から}食べて{ね}。', 'ちゃんと食べて{ね}。……自分のことだと、心配になる。')],
      },
    ],
    input: { prompt: 'なにを食べたの？（書かなくても大丈夫）', placeholder: '例：帰り道の肉まん', question: 'なにを食べたの？' },
    inputReply: (v) =>
      v ? [t(`${v}か。……懐かしい。急に食べたくなった。`, undefined, `${v}か。……懐かしい{ね}。あの頃の味は特別{だよ}。`, `${v}か。……10年後の自分は、それが好きなんだ。`)] : SECRET,
    recall: (c) => t(`${text(c)}……確かに、よく食べてた気がする。`, undefined, `${text(c)}……ああ、よく食べてた{ね}。`, `${text(c)}……覚えておく。未来の自分の、好きなもの。`),
  },

  laugh: {
    question: '最近、声を出して笑ったことは？',
    ask: t('最近、声を出して笑ったこと、ある？', undefined, '最近、声を出して笑ったことは、あるかい。'),
    others: [
      {
        label: '思い出せないかも',
        value: 'forget',
        reply: [t('何で笑ったかは忘れても、笑ってたことは、あとで懐かしくなる{よ}。', undefined, '笑っていた顔は、不思議と覚え{てる}もん{だよ}。', 'そっか。……でも、笑えてるなら、よかった。')],
      },
      {
        label: '最近、あんまり笑ってないかも',
        value: 'rushed',
        reply: [t('そういう時期もある{よ}。小さく笑えたら、それだけ覚えておいて。', undefined, '無理に笑わなくていいん{だよ}。', 'そっか……。こっちで笑ってる分、少し分けてあげたい{よ}。')],
      },
    ],
    input: { prompt: 'なにで笑ったの？（書かなくても大丈夫）', placeholder: '例：友だちの言いまちがい', question: 'なにで笑ったの？' },
    inputReply: (v) =>
      v ? [t(`${v}か。ふふ、こっちまで笑っちゃった。`, undefined, `${v}か。ふふ、そういうのが一番{だよ}。`, `${v}か。ふふ、10年たっても、そういうので笑うんだ。`)] : SECRET,
    recall: (c) => t(`${text(c)}……あったなあ。確かに笑ってた気がする。`, undefined, `${text(c)}……ああ、よく笑ってた{ね}。`, `${text(c)}……覚えておく。未来の自分が笑ったこと。`),
  },

  scene: {
    question: '最近、きれいだと思った景色は？',
    ask: t('最近、きれいだなって思った景色、ある？', undefined, '最近、きれいだと思った景色は、あるかい。'),
    others: [
      {
        label: '思い出せないかも',
        value: 'forget',
        reply: [t('今日の帰り道、少しだけ顔を上げてみて。', undefined, '毎日見てる景色ほど、あとで懐かしいん{だよ}。', '今度空を見たら、思い出して{ね}。10年前の自分と話したこと。')],
      },
      {
        label: '最近、あんまり外を見てないかも',
        value: 'rushed',
        reply: [t('窓の外でもいい{から}、ひと目だけ見てみて。', undefined, '空の色は、毎日ちがう{よ}。ひと目、見てごらん。', '窓の外、ひと目だけ見てみて。……こっちも、今見てる{から}。')],
      },
    ],
    input: { prompt: 'どんな景色？（書かなくても大丈夫）', placeholder: '例：帰り道の夕焼け', question: 'どんな景色だった？' },
    inputReply: (v) => (v ? [t(`${v}か。……目を閉じたら、見えそう。`, undefined, `${v}か。……目を閉じると、浮かんでくる{よ}。`, `${v}か。……こっちからも、見てみたいな。`)] : SECRET),
    recall: (c) => t(`${text(c)}……その景色、確かに見てた気がする。`, undefined, `${text(c)}……ああ、きれいだった{ね}。`, `${text(c)}……いつか、こっちも見られるのかな。`),
  },

  music: {
    question: '最近、よく聴いている音楽は？',
    ask: t('最近、よく聴いてる音楽ってある？', undefined, '最近、よく聴いている音楽は、あるかい。'),
    others: [
      {
        label: 'とくに決まってないかも',
        value: 'forget',
        reply: [t('ふと流れた曲で、この頃を思い出したりする{よ}。', undefined, '流れていた曲が、その頃の空気ごと連れてくるん{だよ}。', 'そっか。……こっちが今聴いてる曲、そっちでは懐かしいのかな。')],
      },
      {
        label: '最近、あんまり聴いてないかも',
        value: 'rushed',
        reply: [t('今聞こえてる音も、いつか懐かしい音になる{よ}。', undefined, '静かなのも、{いい}もん{だよ}。', 'そっか。……静かな時間も、{いい}{ね}。')],
      },
    ],
    input: { prompt: 'どんな曲？（書かなくても大丈夫）', placeholder: '例：通学路で聴く曲', question: 'どんな曲？' },
    inputReply: (v) =>
      v ? [t(`${v}か。……聴いたら、この頃に戻れそう。`, undefined, `${v}か。……懐かしい{ね}。口ずさみたくなる{よ}。`, `${v}か。……10年後は、そういう曲を聴いてるんだ。`)] : SECRET,
    recall: (c) => t(`${text(c)}……確かに、ずっと聴いてた気がする。`, undefined, `${text(c)}……ああ、よく聴いてた{ね}。`, `${text(c)}……覚えておく。いつか、聴いてみる{よ}。`),
  },

  place: {
    question: '最近、よく行く場所は？',
    ask: t('最近、よく行く場所ってある？', undefined, '最近、よく行く場所は、あるかい。'),
    others: [
      {
        label: 'とくにないかも',
        value: 'forget',
        reply: [t('いつもの道こそ、あとで一番懐かしくなる{よ}。', undefined, 'いつも通る道ほど、年をとってから懐かしいん{だよ}。', 'そっか。……いつもの道、10年後も歩いてる？')],
      },
      {
        label: '最近、家にいることが多いかも',
        value: 'rushed',
        reply: [t('窓からの景色も、家の音も、ちゃんと懐かしくなる{よ}。', undefined, '家で過ごす時間も、{いい}もん{だよ}。', '家の時間も、大事{だね}。')],
      },
    ],
    input: { prompt: 'どこに行くの？（書かなくても大丈夫）', placeholder: '例：駅前のパン屋', question: 'よく行く場所は？' },
    inputReply: (v) =>
      v ? [t(`${v}か。……その道、また通ってみたい。`, undefined, `${v}か。……その場所の空気、覚え{てる}{よ}。`, `${v}か。……10年後の自分の、お気に入りの場所なんだ。`)] : SECRET,
    recall: (c) => t(`${text(c)}……確かに、よく行ってた気がする。`, undefined, `${text(c)}……ああ、何度も行ってた{ね}。`, `${text(c)}……いつか、行ってみたいな。`),
  },

  passion: {
    question: '最近、夢中になっていることは？',
    ask: t('最近、夢中になってること、ある？', undefined, '最近、夢中になっていることは、あるかい。'),
    others: [
      {
        label: '探している途中',
        value: 'forget',
        reply: [t('探してる時間も、あとで懐かしい{よ}。急がなくて大丈夫。', undefined, '迷っていた頃が、いちばん懐かしいもん{だよ}。', '探してる途中か。……こっちも、まだ探してる{よ}。')],
      },
      {
        label: '特にないかな',
        value: 'rushed',
        reply: [t('何もない時期も、あとで思えば静かで{いい}時間{だよ}。', undefined, 'それでいいん{だよ}。穏やかな時間も、大事{だよ}。', 'そっか。……それでも、毎日ちゃんと過ごしてるん{だね}。')],
      },
    ],
    input: { prompt: 'なにに夢中なの？（書かなくても大丈夫）', placeholder: '例：夜に聴くラジオ', question: 'なにに夢中なの？' },
    inputReply: (v) =>
      v
        ? [
            t(
              `${v}か。……大事にして{ね}。夢中な時間は、あとで一番まぶしい{から}。`,
              undefined,
              `${v}か。……大事にして{ね}。夢中になれたものは、ずっと残る{よ}。`,
              `${v}か。……10年後の自分は、それに夢中なんだ。かっこいい{ね}。`,
            ),
          ]
        : SECRET,
    recall: (c) => t(`${text(c)}……ああ、確かに夢中だった気がする。`, undefined, `${text(c)}……ああ、夢中だった{ね}。`, `${text(c)}……覚えておく。未来の自分の、夢中なもの。`),
  },
}

export const TOPIC_KEYS = Object.keys(TOPICS)

export function pickTopic(rand = Math.random): string {
  return TOPIC_KEYS[Math.floor(rand() * TOPIC_KEYS.length)]
}
