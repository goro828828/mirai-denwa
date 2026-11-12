/**
 * 台詞を書くための部品
 *
 * t(10年後, 20〜30年後, 40〜60年後, 10年前, 100年後)
 *   年代ごとに話し方を変える。省略した年代は、ひとつ若い年代の台詞を使う。
 *   年齢が上がるほど、ゆっくり落ち着いた話し方にする。
 *   10年前・100年後は、10回に1回だけ現れる特別な相手（省略時：10年前→10年後、100年後→40〜60年後）。
 *
 * 台詞は共通語で書き、地域で変わる部分だけ {だよ} {だね} {だから} {から} {でしょ}
 * {すごく} {いい} {てる} {てた} {よ} {ね} と書く（data/dialects.ts で県ごとに置き換える）。
 */
import { closenessOf, type CallContext } from './engine'

export type Text = string | ((c: CallContext) => string)
export interface Variant {
  young: Text
  middle?: Text
  elder?: Text
  /** 10年前の自分（特別） */
  past?: Text
  /** 100年後の自分（特別） */
  century?: Text
  /** 80〜89歳の自分（省略時：60〜79歳の台詞） */
  eighty?: Text
  /** 90〜100歳の自分（省略時：80代 → 60〜79歳の台詞） */
  ninety?: Text
  /** 子孫（孫・ひ孫…。省略時：10年後の台詞） */
  kin?: Text
  /** 生まれる10年前の親（省略時：10年後の台詞） */
  parent?: Text
}

export const t = (young: Text, middle?: Text, elder?: Text, past?: Text, century?: Text): Variant => ({ young, middle, elder, past, century })

/**
 * あなた（受け手）側の選択肢：通話を重ねるほど、くだけた言い方になる
 * me(1回目, 2回目, 3〜5回目, 6回目〜)。省略した段階は、ひとつ前の段階の言い方を使う。
 */
export const me =
  (...levels: [string, ...(string | undefined)[]]): Text =>
  (c: CallContext) => {
    for (let i = closenessOf(c.callIndex); i >= 0; i--) {
      const v = levels[i]
      if (v) return v
    }
    return levels[0]
  }

/** 80代・90代・子孫の台詞を足す：ag(t(...), { eighty, ninety, kin }) */
export const ag = (v: Variant, more: Pick<Variant, 'eighty' | 'ninety' | 'kin' | 'parent'>): Variant => ({ ...v, ...more })
