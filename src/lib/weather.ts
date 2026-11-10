import type { WeatherInfo, WeatherKind } from '../types'
import type { Prefecture } from '../data/prefectures'

/**
 * 天気取得（仮実装：Open-Meteo。APIキー不要）
 * ※ 天気APIの具体的なサービスは仕様上「未確定」。差し替えはこのファイルだけで済むようにしている。
 * 取得できなかった場合は null を返し、天気を推測しない。
 */
export async function fetchWeather(pref: Prefecture, timeoutMs = 6000): Promise<WeatherInfo | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${pref.lat}&longitude=${pref.lon}` +
    `&current=weather_code,is_day&timezone=Asia%2FTokyo`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    const json = await res.json()
    const code = json?.current?.weather_code
    const isDay = json?.current?.is_day
    if (typeof code !== 'number') return null
    const { kind, label } = classify(code)
    return { kind, label, isDay: isDay === 1, station: pref.station, fetchedAt: new Date().toISOString() }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** WMO weather code → ゲーム内の天気区分 */
export function classify(code: number): { kind: WeatherKind; label: string } {
  if (code === 0 || code === 1) return { kind: 'clear', label: '晴れ' }
  if (code === 2 || code === 3) return { kind: 'cloudy', label: 'くもり' }
  if (code === 45 || code === 48) return { kind: 'cloudy', label: '霧' }
  if (code >= 95) return { kind: 'thunder', label: '雷雨' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', label: '雪' }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', label: '雨' }
  return { kind: 'cloudy', label: 'くもり' }
}

export type AmbientKey = 'clear-day' | 'clear-night' | 'cloudy-day' | 'cloudy-night' | 'rain' | 'thunder'

/**
 * 天気と時間帯 → 環境音
 * 雪は仕様の表にないため、暫定で「曇り」と同じ静かな環境音にしている（未確定）。
 */
export function ambientFor(w: WeatherInfo | null): AmbientKey | null {
  if (!w) return null
  switch (w.kind) {
    case 'rain':
      return 'rain'
    case 'thunder':
      return 'thunder'
    case 'clear':
      return w.isDay ? 'clear-day' : 'clear-night'
    default:
      return w.isDay ? 'cloudy-day' : 'cloudy-night'
  }
}

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'
export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours()
  if (h >= 5 && h < 10) return 'morning'
  if (h >= 10 && h < 16) return 'day'
  if (h >= 16 && h < 19) return 'evening'
  return 'night'
}
