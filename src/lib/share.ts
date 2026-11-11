import type { CallRecord } from '../types'
import { cardFileName, renderCardPng, SITE_URL } from './cardImage'
import { yearsLabel } from '../story/engine'

export const shareText = (r: CallRecord) => `${yearsLabel(r.years ?? 10)}の自分から、着信がありました。\n#未来の自分から着信です`

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

export async function saveCard(r: CallRecord) {
  const blob = await renderCardPng(r)
  downloadBlob(blob, cardFileName(r))
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
