import type { Dialect, LifeStage, WeatherInfo } from '../types'
import type { Text, Variant } from './script'

export interface CallContext {
  name: string
  dialect: Dialect
  lifestage: LifeStage
  weather: WeatherInfo | null
  hour: number
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
