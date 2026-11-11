import type { LifeStage, WeatherInfo } from '../types'
import { renderDialect, type DialectProfile } from '../data/dialects'
import type { Text, Variant } from './text'

/**
 * 話し方の年代
 * - young：10年後（今の延長。気さくな口調）
 * - middle：20・30年後（落ち着いた大人の口調）
 * - elder：40・50・60年後（年を重ねた、ゆっくり穏やかな口調）
 */
export type AgeTier = 'young' | 'middle' | 'elder' | 'past' | 'century'

export const YEARS_CHOICES = [10, 20, 30, 40, 50, 60] as const

/** 10回に1回だけ現れる特別な相手 */
export const SPECIAL_YEARS = [-10, 100] as const
/** 履歴がこの件数たまるごとに、次の通話が特別になる */
export const SPECIAL_EVERY = 10

export function tierOf(years: number): AgeTier {
  if (years < 0) return 'past'
  if (years >= 100) return 'century'
  if (years >= 40) return 'elder'
  if (years >= 20) return 'middle'
  return 'young'
}

/** 何年後の自分につながるかを決める（通話ごとにランダム） */
export function pickYears(rand = Math.random): number {
  return YEARS_CHOICES[Math.floor(rand() * YEARS_CHOICES.length)]
}

/**
 * これまでの通話履歴の件数から、今回つながる相手を決める。
 * 履歴が10件・20件…たまった次の通話は、10年前か100年後の自分（自動で抽選）。
 */
export function pickYearsFor(historyCount: number, rand = Math.random): number {
  // 1〜3回目は、いつも10年後の自分
  if (historyCount < FIXED_FIRST_CALLS) return 10
  // 4回目以降：履歴が10件・20件…たまった次の1回は特別な相手。それ以外は10〜60年後
  if (historyCount % SPECIAL_EVERY === 0) return SPECIAL_YEARS[Math.floor(rand() * SPECIAL_YEARS.length)]
  return pickYears(rand)
}

/** 1〜3回目は10年後に固定 */
export const FIXED_FIRST_CALLS = 3

/**
 * 会話の種類
 * - first：初めての電話（1回目、または10年前・100年後の特別な相手）
 * - second：2回目（再会。お互いに前の電話を覚えている）
 * - regular：3回目以降（いつもの電話）
 */
export type ScriptKind = 'first' | 'second' | 'regular'

export function scriptFor(callIndex: number, years: number): ScriptKind {
  if (years < 0 || years >= 100 || callIndex <= 1) return 'first'
  return callIndex === 2 ? 'second' : 'regular'
}

/** 前回の通話（2回目以降の会話で触れる） */
export interface PrevCall {
  /** 前回から何時間たったか */
  hoursAgo: number
  topic?: string
  /** 前回「最近の◯◯」で書いた言葉（書いていなければ undefined） */
  topicText?: string
}

/** 「10年後」「10年前」の表記 */
export function yearsLabel(years: number): string {
  return years < 0 ? `${-years}年前` : `${years}年後`
}

export interface CallContext {
  name: string
  /** その県の話し方（data/dialects.ts） */
  dialect: DialectProfile
  lifestage: LifeStage
  weather: WeatherInfo | null
  hour: number
  /** 何年後の自分か */
  years: number
  tier: AgeTier
  /** 「最近の◯◯」枠に入る話題（通話ごとにランダム。前回と同じ話題は避ける） */
  topic: string
  /** 何回目の通話か（1から） */
  callIndex: number
  /** 会話の種類（初回・2回目・いつもの） */
  script: ScriptKind
  /** 前回の通話（無ければ undefined） */
  prev?: PrevCall
  /** answerKey → 選んだ value、または自由入力の文字列 */
  answers: Record<string, string>
}

export function resolveText(t: Text, c: CallContext): string {
  return typeof t === 'function' ? t(c) : t
}

export function speak(variant: Variant, c: CallContext): string {
  const text =
    c.tier === 'past'
      ? variant.past ?? variant.young
      : c.tier === 'century'
        ? variant.century ?? variant.elder ?? variant.middle ?? variant.young
        : c.tier === 'elder'
          ? variant.elder ?? variant.middle ?? variant.young
          : c.tier === 'middle'
            ? variant.middle ?? variant.young
            : variant.young
  return renderDialect(resolveText(text, c), c.dialect)
}

/** 自由入力の整形：改行・制御文字を除き、長さを制限する */
export function cleanInput(raw: string, max: number): string {
  return raw
    .replace(/[\u0000-\u001f\u007f{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
