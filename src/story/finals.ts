/**
 * 最後の言葉（テレフォンカードに印字される）
 *
 * カードは「クリアの報酬」ではなく、その日の会話の記念品。
 * だから、その日に話したことから、短い一行を選ぶ（励ましや教えにしない。2文まで）。
 *
 * 選ぶ順番：
 *   1. 「今の気持ち」に書いた言葉の手がかり（つらい・さみしい・疲れた…）
 *   2. 今日の一日（疲れた・うまく言えない）
 *   3. よく話す人と、その話（しょうもない話・同じ部屋にいる…）／帰り道・ごはん・夜・好きなものの答え（routes.ts）
 *   4. 今日の一日（いつもと変わらない・ちょっと楽しいこと）
 * 自由記述の本文はカードに載せない（共有カードに個人的な回答を出さないため）。
 */
import type { CallContext } from './engine'
import { t, type Variant } from './text'
import { ROUTE_LINE } from './routes'

export type FeelingCategory = 'calm' | 'tired' | 'anxious' | 'excited' | 'unsure' | 'lonely' | 'sad' | 'happy' | 'grateful'

/** 自由記述の気持ちから、言葉の手がかりで分類する（AIは使わない簡易判定）。手がかりがなければ null */
const FEELING_KEYWORDS: [FeelingCategory, RegExp][] = [
  ['sad', /悲し|かなし|つら|辛|泣|しんど|きつ|落ち込|へこ|凹/],
  ['lonely', /寂し|さみし|さびし|孤独|ひとりぼっち|一人ぼっち/],
  ['anxious', /不安|心配|こわ|怖|焦|あせ|緊張|モヤ|もや/],
  ['tired', /疲|つかれ|眠|ねむ|だる|休みたい/],
  ['grateful', /ありがと|感謝|おかげ/],
  ['excited', /わくわく|ワクワク|楽しみ|たのしみ|ドキドキ|どきどき/],
  ['happy', /嬉し|うれし|楽し|たのし|幸せ|しあわせ|最高|好き/],
  ['calm', /穏やか|おだやか|落ち着|のんびり|ほっと|ゆったり/],
]

export function feelingCategory(c: CallContext): FeelingCategory | null {
  const text = c.answers.feeling ?? ''
  if (!text) return null
  for (const [cat, re] of FEELING_KEYWORDS) if (re.test(text)) return cat
  return null
}

const FEELING_LINE: Record<FeelingCategory, Variant> = {
  sad: t('しんどかった今日も、ちゃんと一日。', 'しんどかった今日も、ちゃんと一日。'),
  lonely: t('さみしかった夜のことも、ちゃんと覚えておく。', 'さみしかった夜のことも、ちゃんと覚えておく。'),
  anxious: t('そわそわした夜も、いつか静かな思い出。', 'そわそわした夜も、いつか静かな思い出。'),
  tired: t('今日は、ここまで来た。それだけで{いい}{よ}。', '今日は、ここまで来た。それだけで{いい}{よ}。'),
  grateful: t('「ありがとう」が浮かんだ人のこと。', '「ありがとう」が浮かんだ人のこと。'),
  excited: t('わくわくしてた、今日のこと。', 'わくわくしてた、今日のこと。'),
  happy: t('うれしかった今日を、ちゃんと覚えておく。', 'うれしかった今日を、ちゃんと覚えておく。'),
  calm: t('ほっとしてた、今日の空気。', 'ほっとしてた、今日の空気。'),
  unsure: t('うまく言え{ない}日も、ちゃんと一日。', 'うまく言え{ない}日も、ちゃんと一日。'),
}

/** よく話す人と、その話から（キー：people:peopleTalk、または people） */
const PEOPLE_LINE: Record<string, Variant> = {
  'friend:silly': t('何を話したかより、一緒に笑ったこと。', '何を話したかより、一緒に笑ったこと。'),
  'friend:serious': t('まじめな話をした夜も、いつかの思い出。', 'まじめな話をした夜も、いつかの思い出。'),
  friend: t('友だちと過ごした、なんでもない時間。', '友だちと過ごした、なんでもない時間。'),
  'family:normal': t('「今日なにあった？」が、普通{だった}日々。', '「今日なにあった？」が、普通{だった}日々。'),
  'family:quiet': t('話さなくても、同じ部屋にいた時間。', '話さなくても、同じ部屋にいた時間。'),
  family: t('いつもの声が、いつか懐かしい声になる。', 'いつもの声が、いつか懐かしい声になる。'),
  'peer:fun': t('毎日会う顔も、いつか懐かしい顔。', '毎日会う顔も、いつか懐かしい顔。'),
  'peer:hard': t('しんどかった日も、ここまで来た日。', 'しんどかった日も、ここまで来た日。'),
  peer: t('毎日会う顔も、いつか懐かしい顔。', '毎日会う顔も、いつか懐かしい顔。'),
  'alone:blank': t('ぼーっとしてた時間も、ちゃんと残ってる。', 'ぼーっとしてた時間も、ちゃんと残ってる。'),
  'alone:lonely': t('ひとりで見た景色も、ちゃんと残ってる。', 'ひとりで見た景色も、ちゃんと残ってる。'),
  alone: t('ひとりで見た景色も、ちゃんと残ってる。', 'ひとりで見た景色も、ちゃんと残ってる。'),
  own: t('よく話す人の声も、いつか懐かしい声。', 'よく話す人の声も、いつか懐かしい声。'),
}

export function finalMessage(c: CallContext): Variant {
  const a = c.answers
  const pick = (): Variant => {
    const f = feelingCategory(c)
    if (f) return FEELING_LINE[f]
    if (a.day === 'tired') return FEELING_LINE.tired
    if (a.day === 'unsure') return FEELING_LINE.unsure
    const p = PEOPLE_LINE[`${a.people}:${a.peopleTalk}`] ?? PEOPLE_LINE[a.people ?? '']
    if (p) return p
    // 帰り道・ごはん・夜・好きなもの（会話の通しの、2つめの答え）
    for (const k of ['way2', 'food2', 'night2', 'fav2']) if (a[k] && ROUTE_LINE[`${k}:${a[k]}`]) return ROUTE_LINE[`${k}:${a[k]}`]
    if (a.day === 'fun') return t('ちょっといいことがあった、今日のこと。', 'ちょっといいことがあった、今日のこと。')
    return t('なんでもない今日も、いつかの思い出。', 'なんでもない今日も、いつかの思い出。')
  }
  return pick()
}
