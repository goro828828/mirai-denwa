/**
 * テレフォンカードの PNG 生成（Canvas）
 * 画面上のカード（PhoneCard コンポーネント）と同じレイアウトを描く。
 * 個人的な回答の全文はカードに載せない（最後のメッセージのみ）。
 */
import type { CallRecord } from '../types'
import { formatDateTime, weatherText } from './format'
import { yearsLabel } from '../story/engine'
import { illustrationOf, loadIllustration } from './illustrations'

export const SITE_URL: string = import.meta.env.VITE_SITE_URL ?? ''
const FONT = '"Zen Maru Gothic", sans-serif'
export const TOTAL_UNITS = 50

const C = {
  bg: '#efe6d6',
  paper: '#fbf5e9',
  ink: '#3a2e28',
  sub: '#7a6a5e',
  band: '#5d8a80',
  bandInk: '#f6efe2',
  line: '#d9cbb4',
  accent: '#c9785b',
}

/** 句読点などが行頭に来ないようにする簡易禁則つき折り返し */
export function wrapJa(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const noStart = '、。，．・ー）」』！？…ぁぃぅぇぉっゃゅょ'
  const lines: string[] = []
  let cur = ''
  for (const ch of [...text]) {
    const test = cur + ch
    if (ctx.measureText(test).width > maxWidth && cur) {
      if (noStart.includes(ch)) {
        // 前の行に追い込む
        lines.push(test)
        cur = ''
        continue
      }
      lines.push(cur)
      cur = ch
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function ensureFonts(text: string) {
  if (!document.fonts) return
  try {
    await Promise.all([
      document.fonts.load(`400 40px ${FONT}`, text),
      document.fonts.load(`500 40px ${FONT}`, text),
      document.fonts.load(`700 40px ${FONT}`, text),
    ])
  } catch {
    /* フォントが読めなくても代替フォントで描く */
  }
}

export async function renderCardPng(r: CallRecord): Promise<Blob> {
  const W = 1800
  const H = 1160
  const cw = 1720
  const ch = 1080
  const cx = (W - cw) / 2
  const cy = (H - ch) / 2

  const allText =
    '未来の自分から、着信です。テレフォンカード通話記録なまえばしょてんき年前後のよりいつか懐かしくなる今日を0123456789.:（）' +
    r.nickname +
    r.prefName +
    r.finalMessage +
    weatherText(r.weather) +
    formatDateTime(r.createdAt) +
    SITE_URL
  await ensureFonts(allText)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  // カード本体
  ctx.save()
  ctx.shadowColor = 'rgba(60,40,20,0.25)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 10
  roundRect(ctx, cx, cy, cw, ch, 44)
  ctx.fillStyle = C.paper
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRect(ctx, cx, cy, cw, ch, 44)
  ctx.clip()

  // 左の帯
  const bandW = 150
  ctx.fillStyle = C.band
  ctx.fillRect(cx, cy, bandW, ch)
  ctx.fillStyle = C.bandInk
  ctx.font = `500 40px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const vertical = '未来行きテレフォンカード'
  ;[...vertical].forEach((c, i) => ctx.fillText(c, cx + bandW / 2, cy + 120 + i * 62))
  ctx.font = `700 64px ${FONT}`
  ctx.fillText(String(TOTAL_UNITS), cx + bandW / 2, cy + ch - 110)
  ctx.font = `400 26px ${FONT}`
  ctx.fillText('度数', cx + bandW / 2, cy + ch - 60)

  // パンチ穴（使った度数ぶん穴が開く）
  const holes = 10
  const used = Math.round((Math.min(r.usedUnits, TOTAL_UNITS) / TOTAL_UNITS) * holes)
  for (let i = 0; i < holes; i++) {
    const hx = cx + bandW + 120 + i * 60
    const hy = cy + ch - 56
    ctx.beginPath()
    ctx.arc(hx, hy, 12, 0, Math.PI * 2)
    if (i < used) {
      ctx.fillStyle = '#4a3c34'
      ctx.fill()
    } else {
      ctx.strokeStyle = C.line
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }

  const left = cx + bandW + 90
  const right = cx + cw - 90
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = C.ink
  ctx.font = `700 62px ${FONT}`
  ctx.fillText('未来の自分から、着信です。', left, cy + 140)

  ctx.fillStyle = C.sub
  ctx.font = `400 34px ${FONT}`
  ctx.fillText(`${formatDateTime(r.createdAt)} 通話`, left, cy + 200)

  // 項目
  const fields: [string, string][] = [
    ['なまえ', r.nickname],
    ['ばしょ', r.prefName],
    ['てんき', weatherText(r.weather)],
  ]
  let fy = cy + 290
  for (const [k, val] of fields) {
    ctx.fillStyle = C.sub
    ctx.font = `500 30px ${FONT}`
    ctx.fillText(k, left, fy)
    ctx.fillStyle = C.ink
    ctx.font = `500 40px ${FONT}`
    ctx.fillText(val, left + 150, fy)
    fy += 62
  }

  // 区切り線
  ctx.strokeStyle = C.line
  ctx.lineWidth = 3
  ctx.setLineDash([14, 12])
  ctx.beginPath()
  ctx.moveTo(left, fy - 8)
  ctx.lineTo(right, fy - 8)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = C.accent
  ctx.font = `500 30px ${FONT}`
  ctx.fillText(`${yearsLabel(r.years ?? 10)}の ${r.nickname} より`, left, fy + 52)

  // メッセージ（長さに応じて文字サイズを調整）
  const msgTop = fy + 120
  const msgBottom = cy + ch - 120
  let size = 46
  let lines: string[] = []
  for (; size >= 30; size -= 2) {
    ctx.font = `500 ${size}px ${FONT}`
    lines = wrapJa(ctx, r.finalMessage, right - left)
    if (lines.length * size * 1.7 <= msgBottom - msgTop) break
  }
  ctx.fillStyle = C.ink
  lines.forEach((l, i) => ctx.fillText(l, left, msgTop + i * size * 1.7))

  // 挿絵（右上）
  const illust = await loadIllustration(illustrationOf(r))
  if (illust) {
    const size = 340
    ctx.drawImage(illust, right - size + 30, cy + 50, size, size)
  }

  // フッター
  ctx.fillStyle = C.sub
  ctx.font = `400 26px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(SITE_URL || 'いつか懐かしくなる今日を、あなたはどう過ごしますか。', right, cy + ch - 46)

  ctx.restore()

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNGの生成に失敗しました'))), 'image/png'),
  )
}

export function cardFileName(r: CallRecord): string {
  const d = new Date(r.createdAt)
  const p = (n: number) => String(n).padStart(2, '0')
  return `mirai-call-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.png`
}
