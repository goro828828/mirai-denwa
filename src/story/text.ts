/**
 * 台詞を書くための部品
 *
 * v(標準語, 関西弁, 博多弁)
 *   関西弁・博多弁を省略すると標準語を使う。
 *
 * a(10年後, 20〜30年後, 40〜60年後)
 *   年代ごとに話し方を変える。それぞれが v(...)。
 *   年齢が上がるほど、ゆっくり落ち着いた話し方にする。
 */
import { resolveText, type CallContext } from './engine'

export type Text = string | ((c: CallContext) => string)
export interface Variant {
  standard: Text
  kansai?: Text
  hakata?: Text
}

export const v = (standard: Text, kansai?: Text, hakata?: Text): Variant => ({ standard, kansai, hakata })

type DialectKey = 'standard' | 'kansai' | 'hakata'

export const a = (young: Variant, middle: Variant, elder: Variant): Variant => {
  const pick = (c: CallContext) => (c.tier === 'elder' ? elder : c.tier === 'middle' ? middle : young)
  const get = (d: DialectKey) => (c: CallContext) => {
    const p = pick(c)
    return resolveText(p[d] ?? p.standard, c)
  }
  return { standard: get('standard'), kansai: get('kansai'), hakata: get('hakata') }
}
