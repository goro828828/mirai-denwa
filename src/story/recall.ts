/**
 * 「確かにそうだった気がする」という振り返り。
 * 回答への返事のあとに、ランダムで差しこむ（未来の出来事は語らず、今の自分を懐かしむ記憶としてだけ話す）。
 * キーは「ノードID:選んだ値」。話題枠の自由入力は topics.ts の recall を使う。
 */
import type { CallContext } from './engine'
import { t, type Variant } from './text'
import { TOPICS } from './topics'

const RECALL: Record<string, Variant> = {
  'day:ordinary': t('……確かにこの頃、そんな毎日だった気がする。', undefined, '……ああ、あの頃はそういう毎日だった{ね}。'),
  'day:busy': t('……そういえば、この頃はいつもバタバタしてた気がする。', undefined, '……あの頃は、いつも走り回ってた{ね}。'),
  'day:bad': t('……そういう日、確かにあった気がする。', undefined, '……そういう日も、確かにあった{ね}。'),
  'day:good': t('……ああ、あったなあ、そういう日。', undefined, '……ああ、あったね、そういう日が。'),
  'people:family': t('……そうそう、家でそんな話をしてた気がする。', undefined, '……家の台所の音まで、思い出す{よ}。'),
  'people:friend': t('……何の話かは忘れたけど、笑ってたのは覚え{てる}。', undefined, '……あの頃は、くだらない話でよく笑ってた{ね}。'),
  'people:peer': t('……確かに、毎日顔を合わせてた気がする。', undefined, '……毎日会っていた人たちのこと、ふと思い出す{よ}。'),
  'people:alone': t('……確かに、ひとりで考えごとをしてた気がする。', undefined, '……あの頃は、ひとりでよく考えごとをしてた{ね}。'),
  'mood:calm': t('……この頃の空気、確かにそんな感じだった気がする。', undefined, '……あの頃の穏やかな空気、覚え{てる}{よ}。'),
  'mood:tired': t('……確かに、この頃はよく疲れてた気がする。', undefined, '……あの頃はよく疲れてた{ね}。よくやってた{よ}。'),
  'mood:anxious': t('……確かに、こういう夜があった気がする。', undefined, '……ああ、そういう夜も、確かにあった{ね}。'),
  'mood:excited': t('……確かにこの頃、何かにそわそわしてた気がする。', undefined, '……あの頃は、いつも何かにそわそわしてた{ね}。'),
  'mood:unsure': t('……確かに、気持ちがよくわからない頃だった気がする。', undefined, '……あの頃は、自分の気持ちがよくわからなかった{よ}。'),
}

/** 振り返りを差しこむ確率（1回の通話で最低1回は「今日の気持ち」で必ず出す） */
export const RECALL_CHANCE = 0.4

export function recallFor(nodeId: string, value: string, c: CallContext): Variant | null {
  if (nodeId === 'topicText') return TOPICS[c.topic]?.recall(c) ?? null
  return RECALL[`${nodeId}:${value}`] ?? null
}
