/**
 * 端末内保存（localStorage）
 * 端末の変更やブラウザデータの削除で消える可能性がある。クラウド保存ではない。
 */
import type { CallRecord } from '../types'
import { storeKey } from './trial'

const HISTORY_KEY = storeKey('mirai-denwa:history:v1')
const SETTINGS_KEY = storeKey('mirai-denwa:settings:v1')
const DRAFT_KEY = storeKey('mirai-denwa:profile-draft:v1')
const BIRTHDAY_KEY = storeKey('mirai-denwa:birthday:v1')
const CAPSULE_KEY = storeKey('mirai-denwa:capsules:v1')

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
  return write(HISTORY_KEY, [r, ...loadHistory()].slice(0, 1000))
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

/** 誕生日（「03-14」。4回目の100歳の自分に教えたもの） */
export function loadBirthday(): string | null {
  return read<string | null>(BIRTHDAY_KEY, null)
}
export function saveBirthday(v: string) {
  write(BIRTHDAY_KEY, v)
}

/** タイムカプセル：1年後の自分へのひとこと */
export interface Capsule {
  id: string
  text: string
  writtenAt: string
  deliverAt: string
  delivered?: boolean
}
export function loadCapsules(): Capsule[] {
  const list = read<Capsule[]>(CAPSULE_KEY, [])
  return Array.isArray(list) ? list : []
}
export function addCapsule(text: string, now = new Date()) {
  const at = new Date(now)
  at.setFullYear(at.getFullYear() + 1)
  const c: Capsule = { id: `${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`, text, writtenAt: now.toISOString(), deliverAt: at.toISOString() }
  write(CAPSULE_KEY, [...loadCapsules(), c])
}
export function markCapsulesDelivered(ids: string[]) {
  write(CAPSULE_KEY, loadCapsules().map((c) => (ids.includes(c.id) ? { ...c, delivered: true } : c)))
}
