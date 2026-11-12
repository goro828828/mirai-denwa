import type { Gender, LifeStage, WeatherInfo } from '../types'
import { renderDialect, type DialectProfile } from '../data/dialects'
import type { Text, Variant } from './text'

/**
 * 話し方の年代（未来の自分の「年齢」＝ いまの年齢 ＋ ◯年後 で決める）
 * - young：〜39歳（今の延長。気さくな口調）
 * - middle：40〜59歳（落ち着いた大人の口調）
 * - elder：60〜79歳（年を重ねた、ゆっくり穏やかな口調。70歳から、少し物忘れが出てくる）
 * - eighty：80〜89歳（ゆっくり、ひと息ずつ話す。耳が少し遠い）
 * - ninety：90〜100歳（言葉少なで、遠い記憶を手繰るように話す）
 * - parent：生まれる10年前の親（10回に1回の特別な回）／century：100年後の自分（特別。ふだんの上限100歳とは別で、120歳の自分とも話せる）
 * - kin：自分の年代を越えた未来で、電話に出てくれる子孫（孫・ひ孫…雲孫。年はあなたと同じくらい）
 * 2005年生まれ（21歳）を起点に作った台詞を、年齢で流用する：10年後＝31歳、20・30年後＝41・51歳、40〜50年後＝61・71歳、60年後＝81歳、70年後＝91歳
 */
export type AgeTier = 'young' | 'middle' | 'elder' | 'eighty' | 'ninety' | 'past' | 'century' | 'kin' | 'parent'

/** 未来の自分の年齢の上限（これを超える年代には、自分は出ない） */
export const MAX_AGE = 100
/** 登録できる年齢 */
export const MIN_PLAYER_AGE = 10
export const MAX_PLAYER_AGE = 90
/** 年齢が未登録の古いデータは、2005年生まれ（21歳）として扱う */
export const DEFAULT_AGE = 21

export const YEARS_CHOICES = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const

/** 10回に1回だけ現れる特別な相手：100年後の自分か、生まれる10年前の親 */
export const CENTURY_YEARS = 100
/** 親が出たときの relation */
export const PARENT = '親'
/** 親につながる年：生まれた年の10年前（＝ いまから「年齢＋10」年前） */
export const parentYears = (age: number) => -(age + 10)
/** 履歴がこの件数たまるごとに、次の通話が特別になる */
export const SPECIAL_EVERY = 10

/** 何年後の自分（または子孫）か → 話し方 */
export function tierFor(years: number, age = DEFAULT_AGE, relation?: string): AgeTier {
  if (relation === PARENT) return 'parent'
  if (relation) return 'kin'
  if (years < 0) return 'past'
  if (years >= 100) return 'century'
  const a = age + years
  if (a >= 90) return 'ninety'
  if (a >= 80) return 'eighty'
  if (a >= 60) return 'elder'
  if (a >= 40) return 'middle'
  return 'young'
}

/** 何年後の自分につながるかを決める（通話ごとにランダム。未来の自分が100歳を超えない範囲） */
export function pickYears(age = DEFAULT_AGE, rand = Math.random): number {
  const ok = YEARS_CHOICES.filter((y) => age + y <= MAX_AGE)
  const list = ok.length ? ok : [10]
  return list[Math.floor(rand() * list.length)]
}

/**
 * これまでの通話履歴の件数から、今回つながる相手を決める。
 * 1〜3回目は10年後。4回目以降は10〜90年後（100歳まで）。
 * 10の倍数の回（10・20・30…回目）は特別：100年後の自分か、生まれる10年前の親（半々）。
 * 戻り値の relation が「親」なら、親につながる。
 */
export function pickYearsFor(historyCount: number, age = DEFAULT_AGE, rand = Math.random): { years: number; relation?: string } {
  if (historyCount < FIXED_FIRST_CALLS) return { years: 10 }
  if (isSpecialCall(historyCount + 1)) return rand() < 0.5 ? { years: parentYears(age), relation: PARENT } : { years: CENTURY_YEARS }
  return { years: pickYears(age, rand) }
}

/** 10回に1回の特別な回か（10・20・30…回目） */
export function isSpecialCall(callIndex: number): boolean {
  return callIndex > FIXED_FIRST_CALLS && callIndex % SPECIAL_EVERY === 0
}

/** 1〜3回目は10年後に固定 */
export const FIXED_FIRST_CALLS = 3

/**
 * 自分から年代を選んでかけられる回（イベント）
 * 10回ごとの区切り（1〜10回目、11〜20回目…）の中で、必ず1回だけ起きる。
 * 区切りの10回目は特別な回なので、1〜9回目のどこか（最初の区切りは、10年後に固定の1〜3回目を除いた4〜9回目）から抽選する。
 * 抽選は端末ごとの種（seed）から決まるので、同じ区切りの中で結果が変わらない。
 */
export const DIAL_EVENT_SPAN = 10
export function isDialEvent(callIndex: number, seed: number): boolean {
  if (callIndex <= FIXED_FIRST_CALLS || isSpecialCall(callIndex)) return false
  const block = Math.floor((callIndex - 1) / DIAL_EVENT_SPAN)
  const allowed = Array.from({ length: DIAL_EVENT_SPAN - 1 }, (_, i) => block * DIAL_EVENT_SPAN + i + 1).filter((n) => n > FIXED_FIRST_CALLS)
  return callIndex === allowed[Math.floor(dialEventRand(seed, block) * allowed.length)]
}
function dialEventRand(seed: number, cycle: number): number {
  // mulberry32
  let x = (seed + cycle * 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 15), x | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296
}

/** 自分の年代を越えた未来に出る子孫（30年ごとに一代ずつ。雲孫まで） */
export const RELATIONS = ['孫', 'ひ孫', '玄孫', '来孫', '昆孫', '仍孫', '雲孫'] as const
export const RELATION_READING: Record<string, string> = {
  孫: 'まご',
  ひ孫: 'ひまご',
  玄孫: 'やしゃご',
  来孫: 'らいそん',
  昆孫: 'こんそん',
  仍孫: 'じょうそん',
  雲孫: 'うんそん',
}

/** 自分でかけた番号（年）の結果 */
export type DialResult =
  | { kind: 'self'; years: number }
  | { kind: 'kin'; years: number; relation: string }
  | { kind: 'past'; back: number; pastAge: number }
  | { kind: 'now' }
  | { kind: 'tooFar' }
  | { kind: 'unreachable' }

/**
 * かけた年から、誰につながるかを決める（日付は今日と同じ月日だけ）
 * - 未来：年の差は10年単位に切り捨てる（例：32年後 → 30年後の自分と同じ内容）
 *   自分が100歳を超える年代は子孫：100歳を超えた最初の30年が「孫」、そこから30年ごとに ひ孫・玄孫…雲孫。その先はつながらない
 * - 過去：10歳の自分までさかのぼれる（すぐに切られてしまう）
 */
export function resolveDial(year: number, age = DEFAULT_AGE, nowYear = new Date().getFullYear()): DialResult {
  const diff = year - nowYear
  if (diff > 0) {
    const years = Math.floor(diff / 10) * 10
    if (years === 0) return { kind: 'now' }
    const future = age + years
    if (future <= MAX_AGE) return { kind: 'self', years }
    const idx = Math.floor((future - MAX_AGE - 1) / 30)
    if (idx >= RELATIONS.length) return { kind: 'unreachable' }
    return { kind: 'kin', years, relation: RELATIONS[idx] }
  }
  if (diff === 0) return { kind: 'now' }
  const back = -diff
  if (age - back < MIN_PLAYER_AGE) return { kind: 'tooFar' }
  return { kind: 'past', back, pastAge: age - back }
}

/**
 * 会話の種類
 * - first：初めての電話（1回目、または10年前・100年後の特別な相手）
 * - second：2回目（再会。お互いに前の電話を覚えている）
 * - regular：3回目以降（いつもの電話）
 * - dialed：自分から年代を選んでかけた回（相手は、まさかかかってくるとは思っていない）
 */
export type ScriptKind = 'first' | 'second' | 'regular' | 'dialed'

export function scriptFor(callIndex: number, years: number, dialed = false): ScriptKind {
  if (dialed) return 'dialed'
  if (years < 0 || years >= 100 || callIndex <= 1) return 'first'
  return callIndex === 2 ? 'second' : 'regular'
}

/**
 * あなた（受け手）側の、打ち解け度合い
 * 通話を重ねるほど、選択肢の言葉がくだけていく。
 * - 0：1回目（まだぎこちない。ていねい）
 * - 1：2回目（少しやわらかい）
 * - 2：3〜5回目（くだけてくる）
 * - 3：6回目〜（すっかりフランク。友だちと話すような調子）
 */
export type Closeness = 0 | 1 | 2 | 3
export function closenessOf(callIndex: number): Closeness {
  if (callIndex <= 1) return 0
  if (callIndex === 2) return 1
  if (callIndex <= 5) return 2
  return 3
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
  /** いまの年齢 */
  age: number
  /** 相手の年齢（自分なら いまの年齢＋◯年後。子孫・特別な相手では使わない） */
  futureAge: number
  /** 子孫が出たとき（「孫」など） */
  relation?: string
  /** あなたの性別（子孫があなたを「おじいちゃん／おばあちゃん」と呼ぶときに使う） */
  gender?: Gender
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
  const v = variant
  const pick: Record<AgeTier, () => Text> = {
    young: () => v.young,
    middle: () => v.middle ?? v.young,
    elder: () => v.elder ?? v.middle ?? v.young,
    eighty: () => v.eighty ?? v.elder ?? v.middle ?? v.young,
    ninety: () => v.ninety ?? v.eighty ?? v.elder ?? v.middle ?? v.young,
    past: () => v.past ?? v.young,
    parent: () => v.parent ?? v.young,
    century: () => v.century ?? v.elder ?? v.middle ?? v.young,
    kin: () => v.kin ?? v.young,
  }
  return renderDialect(resolveText(pick[c.tier](), c), c.dialect)
}

/** 相手の名乗り（「30年後の はる」「100年後の はるの玄孫」） */
export function callerLabel(years: number, nickname: string, relation?: string): string {
  return relation ? `${yearsLabel(years)}の ${nickname}の${relation}` : `${yearsLabel(years)}の ${nickname}`
}

/** 自由入力の整形：改行・制御文字を除き、長さを制限する */
export function cleanInput(raw: string, max: number): string {
  return raw
    .replace(/[\u0000-\u001f\u007f{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
