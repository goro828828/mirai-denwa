import type { Dialect, LifeStage, WeatherInfo } from '../types'
import type { Text, Variant } from './text'

/**
 * 話し方の年代
 * - young：10年後（今の延長。気さくな口調）
 * - middle：20・30年後（落ち着いた大人の口調）
 * - elder：40・50・60年後（年を重ねた、ゆっくり穏やかな口調）
 */
export type AgeTier = 'young' | 'middle' | 'elder'

export const YEARS_CHOICES = [10, 20, 30, 40, 50, 60] as const

export function tierOf(years: number): AgeTier {
  if (years >= 40) return 'elder'
  if (years >= 20) return 'middle'
  return 'young'
}

/** 何年後の自分につながるかを決める（通話ごとにランダム） */
export function pickYears(rand = Math.random): number {
  return YEARS_CHOICES[Math.floor(rand() * YEARS_CHOICES.length)]
}

export interface CallContext {
  name: string
  dialect: Dialect
  lifestage: LifeStage
  weather: WeatherInfo | null
  hour: number
  /** 何年後の自分か */
  years: number
  tier: AgeTier
  /** 「最近の◯◯」枠に入る話題（通話ごとにランダム） */
  topic: string
  /** answerKey → 選んだ value、または自由入力の文字列 */
  answers: Record<string, string>
}

export function resolveText(t: Text, c: CallContext): string {
  return typeof t === 'function' ? t(c) : t
}

export function speak(variant: Variant, c: CallContext): string {
  const t = variant[c.dialect] ?? variant.standard
  return resolveText(t, c)
}

/** 自由入力の整形：改行・制御文字を除き、長さを制限する */
export function cleanInput(raw: string, max: number): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
