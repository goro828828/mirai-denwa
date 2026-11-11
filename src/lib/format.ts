import type { WeatherInfo } from '../types'

const WD = ['日', '月', '火', '水', '木', '金', '土']

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}（${WD[d.getDay()]}）${p(d.getHours())}:${p(d.getMinutes())}`
}

export function weatherText(w: WeatherInfo | null): string {
  if (!w) return '—'
  if (w.manual) return w.label
  if (w.source === 'here') return `${w.label}（現在地）`
  return `${w.label}（${w.station}）`
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
