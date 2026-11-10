import type { WeatherInfo, WeatherKind } from '../types'
import type { Prefecture } from '../data/prefectures'

/**
 * 天気の取得
 *
 * 1. 気象庁の府県天気予報（都道府県ごとの公式データ。APIキー不要・ブラウザから直接取得できる）
 * 2. 取得できなければ Open-Meteo（予備。代表地点の緯度経度で現在の天気）
 * 3. どちらも取れなければ null を返す（天気は推測しない。画面でプレイヤーが任意で選べる）
 *
 * 出典：気象庁ホームページ（https://www.jma.go.jp/）
 */
export async function fetchWeather(pref: Prefecture): Promise<WeatherInfo | null> {
  return (await fromJma(pref)) ?? (await fromOpenMeteo(pref))
}

async function getJson(url: string, timeoutMs = 6000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ---------------- 気象庁 ----------------

/** 都道府県コード → 気象庁の予報区（府県予報区）コード */
const JMA_OFFICE: Record<string, string> = {
  '01': '016000', '02': '020000', '03': '030000', '04': '040000', '05': '050000', '06': '060000', '07': '070000',
  '08': '080000', '09': '090000', '10': '100000', '11': '110000', '12': '120000', '13': '130000', '14': '140000',
  '15': '150000', '16': '160000', '17': '170000', '18': '180000', '19': '190000', '20': '200000', '21': '210000',
  '22': '220000', '23': '230000', '24': '240000', '25': '250000', '26': '260000', '27': '270000', '28': '280000',
  '29': '290000', '30': '300000', '31': '310000', '32': '320000', '33': '330000', '34': '340000', '35': '350000',
  '36': '360000', '37': '370000', '38': '380000', '39': '390000', '40': '400000', '41': '410000', '42': '420000',
  '43': '430000', '44': '440000', '45': '450000', '46': '460100', '47': '471000',
}

/** 県庁所在地を含む予報区が、予報データの先頭ではない県 */
const JMA_AREA_NAME: Record<string, string> = {
  '11': '南部', // 埼玉県：さいたま市
  '35': '中部', // 山口県：山口市
}

interface JmaForecast {
  timeSeries: { areas: { area: { name: string }; weatherCodes?: string[]; weathers?: string[] }[] }[]
}

async function fromJma(pref: Prefecture): Promise<WeatherInfo | null> {
  const office = JMA_OFFICE[pref.code]
  if (!office) return null
  const json = (await getJson(`https://www.jma.go.jp/bosai/forecast/data/forecast/${office}.json`)) as JmaForecast[] | null
  const areas = json?.[0]?.timeSeries?.[0]?.areas
  if (!Array.isArray(areas) || areas.length === 0) return null
  const wanted = JMA_AREA_NAME[pref.code]
  const area = (wanted && areas.find((a) => a.area?.name === wanted)) || areas[0]
  const code = area.weatherCodes?.[0]
  if (!code) return null
  const { kind, label } = classifyJma(code, area.weathers?.[0] ?? '')
  return {
    kind,
    label,
    isDay: isDaytime(pref.lat, pref.lon),
    station: area.area.name,
    fetchedAt: new Date().toISOString(),
    source: 'jma',
  }
}

/**
 * 気象庁の天気コード（3桁）→ ゲーム内の天気区分
 * 先頭の数字が今日の主な天気：1=晴れ 2=くもり 3=雨 4=雪。雷は文に「雷」を含むとき。
 */
export function classifyJma(code: string, text: string): { kind: WeatherKind; label: string } {
  const head = code.charAt(0)
  if (head === '3' && text.includes('雷')) return { kind: 'thunder', label: '雷雨' }
  if (head === '1') return { kind: 'clear', label: '晴れ' }
  if (head === '2') return { kind: 'cloudy', label: 'くもり' }
  if (head === '3') return { kind: 'rain', label: '雨' }
  if (head === '4') return { kind: 'snow', label: '雪' }
  return { kind: 'cloudy', label: 'くもり' }
}

// ---------------- Open-Meteo（予備） ----------------

async function fromOpenMeteo(pref: Prefecture): Promise<WeatherInfo | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${pref.lat}&longitude=${pref.lon}` +
    `&current=weather_code,is_day&timezone=Asia%2FTokyo`
  const json = (await getJson(url)) as { current?: { weather_code?: number; is_day?: number } } | null
  const code = json?.current?.weather_code
  if (typeof code !== 'number') return null
  const { kind, label } = classify(code)
  return {
    kind,
    label,
    isDay: json?.current?.is_day === 1,
    station: pref.station,
    fetchedAt: new Date().toISOString(),
    source: 'open-meteo',
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

// ---------------- 昼か夜か ----------------

/** 太陽の高度（度）。県の代表地点の緯度経度と現在時刻から計算する */
export function solarElevation(lat: number, lon: number, date = new Date()): number {
  const rad = Math.PI / 180
  const day = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60
  const g = ((2 * Math.PI) / 365) * (day - 1 + (hours - 12) / 24)
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const trueSolarMin = hours * 60 + eqTime + 4 * lon
  const hourAngle = (trueSolarMin / 4 - 180) * rad
  const cosZen = Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(hourAngle)
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZen))) / rad
}

/** 日の出から日の入りまでを「昼」とする */
export function isDaytime(lat: number, lon: number, date = new Date()): boolean {
  return solarElevation(lat, lon, date) > -0.833
}

// ---------------- 環境音 ----------------

export type AmbientKey = 'clear-day' | 'clear-night' | 'cloudy-day' | 'cloudy-night' | 'rain' | 'thunder'

/**
 * 環境音ファイルと音量。音源の出典とライセンスは public/audio/ambient/CREDITS.md と lib/credits.ts を参照。
 * 曇りは専用の音源がまだ無いため、暫定で晴れと同じ音源を少し小さく流す（未確定）。
 */
export const AMBIENT_SOURCES: Record<AmbientKey, { file: string; level: number }> = {
  'clear-day': { file: 'clear-day', level: 1 },
  'clear-night': { file: 'clear-night', level: 1 },
  'cloudy-day': { file: 'clear-day', level: 0.55 },
  'cloudy-night': { file: 'clear-night', level: 0.55 },
  rain: { file: 'rain', level: 1 },
  thunder: { file: 'thunder', level: 1 },
}

/**
 * 天気と時間帯 → 環境音
 * 雪は仕様の表にないため、暫定で「曇り」と同じ扱いにしている（未確定）。
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
