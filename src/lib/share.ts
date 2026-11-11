import type { CallRecord } from '../types'
import { cardFileName, renderCardPng, SITE_URL } from './cardImage'
import { yearsLabel } from '../story/engine'

export const shareText = (r: CallRecord) =>
  r.relation
    ? `${yearsLabel(r.years ?? 10)}に電話をかけたら、${r.relation}が出てくれました。\n#未来の自分から着信です`
    : r.dialed
      ? `${yearsLabel(r.years ?? 10)}の自分に、電話をかけました。\n#未来の自分から着信です`
      : `${yearsLabel(r.years ?? 10)}の自分から、着信がありました。\n#未来の自分から着信です`

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** iPhone・iPad（iPadOS は Mac のふりをするので、タッチで見分ける） */
export function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent)
}

/**
 * 保存のしかた
 * - photos：iPhone・iPad。共有シートを開き、「画像を保存」で写真アプリに入る
 *   （Web ページは写真アプリへ直接書きこめないため、OS の保存メニューを使う）
 * - gallery：Android。ダウンロードすると、写真（ギャラリー）アプリの「Download」に入る
 * - download：パソコンなど
 */
export type SaveMode = 'photos' | 'gallery' | 'download'
export function saveMode(): SaveMode {
  if (isIOS() && canShareFiles()) return 'photos'
  if (isAndroid()) return 'gallery'
  return 'download'
}

/**
 * カード画像を保存する。blob は先に作っておく（iPhone では、タップから時間がたつと共有シートが開けないため）
 */
export async function saveCard(r: CallRecord, blob?: Blob | null): Promise<SaveMode | 'cancelled'> {
  const mode = saveMode()
  if (mode === 'photos') {
    const file = new File([blob ?? (await renderCardPng(r))], cardFileName(r), { type: 'image/png' })
    try {
      // 画像だけを渡す（文章をつけると「画像を保存」が出ないことがある）
      await navigator.share({ files: [file] })
      return 'photos'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // 共有シートが開けなかったときは、ダウンロードで保存する
      downloadBlob(file, file.name)
      return 'download'
    }
  }
  downloadBlob(blob ?? (await renderCardPng(r)), cardFileName(r))
  return mode
}

export function canShareFiles(): boolean {
  try {
    const f = new File([new Blob()], 'x.png', { type: 'image/png' })
    return !!navigator.canShare?.({ files: [f] })
  } catch {
    return false
  }
}

/** 共有：対応ブラウザでは画像つきで共有シートを開く。成功/キャンセル/失敗を返す */
export async function shareCard(r: CallRecord): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!navigator.share) return 'unsupported'
  const blob = await renderCardPng(r)
  const file = new File([blob], cardFileName(r), { type: 'image/png' })
  const data: ShareData = { text: shareText(r), ...(SITE_URL ? { url: SITE_URL } : {}) }
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ ...data, files: [file] })
    else await navigator.share(data)
    return 'shared'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    return 'unsupported'
  }
}

export function xIntentUrl(r: CallRecord): string {
  const p = new URLSearchParams({ text: shareText(r) })
  if (SITE_URL) p.set('url', SITE_URL)
  return `https://x.com/intent/post?${p.toString()}`
}
