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
  'day:fun': t('……ああ、あったなあ、そういう日。', undefined, '……ああ、あったね、そういう日が。'),
  'day:tired': t('……そういえば、この頃はよく疲れてた気がする。', undefined, '……あの頃はよく疲れてた{ね}。よくやってた{よ}。'),
  'day:unsure': t('……確かに、うまく言えない日が多かった気がする。', undefined, '……あの頃は、うまく言えない日も多かった{ね}。'),
  'people:family': t('……そうそう、家でそんな話をしてた気がする。', undefined, '……家の台所の音まで、思い出す{よ}。'),
  'people:friend': t('……何の話かは忘れたけど、笑ってたのは覚え{てる}。', undefined, '……あの頃は、くだらない話でよく笑ってた{ね}。'),
  'people:peer': t('……確かに、毎日顔を合わせてた気がする。', undefined, '……毎日会っていた人たちのこと、ふと思い出す{よ}。'),
  'people:alone': t('……確かに、ひとりで考えごとをしてた気がする。', undefined, '……あの頃は、ひとりでよく考えごとをしてた{ね}。'),
}

/** 振り返りを差しこむ確率（1回の通話で最低1回は「よく話す人」で必ず出す） */
export const RECALL_CHANCE = 0.4

export function recallFor(nodeId: string, value: string, c: CallContext): Variant | null {
  // 子孫は「振り返る」立場ではない
  // 子孫と親は「振り返る」立場ではない
  if (c.tier === 'kin' || c.tier === 'parent') return null
  if (nodeId === 'topicText') return TOPICS[c.topic]?.recall(c) ?? null
  // 10年前の自分は「振り返る」立場ではないので、話題の自由入力以外では振り返らない
  if (c.tier === 'past') return null
  // よく話す人は、もう一歩聞いたあと（peopleTalk）に振り返る。話したくない・しんどい答えのあとは振り返らない
  if (nodeId === 'people') return null
  if (nodeId === 'peopleTalk') return ['skip', 'unsure', 'hard', 'lonely'].includes(value) ? null : RECALL[`people:${c.answers.people}`] ?? null
  return RECALL[`${nodeId}:${value}`] ?? null
}
