/**
 * 端末内保存（localStorage）
 * 端末の変更やブラウザデータの削除で消える可能性がある。クラウド保存ではない。
 */
import type { CallRecord } from '../types'

const HISTORY_KEY = 'mirai-denwa:history:v1'
const SETTINGS_KEY = 'mirai-denwa:settings:v1'
const DRAFT_KEY = 'mirai-denwa:profile-draft:v1'

function read<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadHistory(): CallRecord[] {
  const list = read<CallRecord[]>(HISTORY_KEY, [])
  return Array.isArray(list) ? list : []
}
export function addHistory(r: CallRecord): boolean {
  return write(HISTORY_KEY, [r, ...loadHistory()].slice(0, 100))
}
export function deleteHistory(id: string) {
  write(HISTORY_KEY, loadHistory().filter((r) => r.id !== id))
}
export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* noop */
  }
}

export interface Settings {
  volume: number
  muted: boolean
  /** null = 端末の設定に従う */
  reduceMotion: boolean | null
  /** 現在地の天気を使う（位置情報の許可を求める） */
  useLocation: boolean
  /** BGM（タイトル画面とカード印字の場面で流れる曲） */
  music: boolean
}
export const DEFAULT_SETTINGS: Settings = { volume: 0.7, muted: false, reduceMotion: null, useLocation: true, music: true }
export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY, {}) }
}
export function saveSettings(s: Settings) {
  write(SETTINGS_KEY, s)
}

export function loadDraft<T>(): Partial<T> {
  return read<Partial<T>>(DRAFT_KEY, {})
}
export function saveDraft(v: unknown) {
  write(DRAFT_KEY, v)
}
