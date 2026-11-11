/**
 * 台詞を書くための部品
 *
 * t(10年後, 20〜30年後, 40〜60年後)
 *   年代ごとに話し方を変える。省略した年代は、ひとつ若い年代の台詞を使う。
 *   年齢が上がるほど、ゆっくり落ち着いた話し方にする。
 *
 * 台詞は共通語で書き、地域で変わる部分だけ {だよ} {だね} {だから} {から} {でしょ}
 * {すごく} {いい} {てる} {てた} {よ} {ね} と書く（data/dialects.ts で県ごとに置き換える）。
 */
import type { CallContext } from './engine'

export type Text = string | ((c: CallContext) => string)
export interface Variant {
  young: Text
  middle?: Text
  elder?: Text
}

export const t = (young: Text, middle?: Text, elder?: Text): Variant => ({ young, middle, elder })
