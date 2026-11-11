/**
 * テレフォンカードの挿絵（線画・13種類＋公衆電話）
 * カードの色（くすんだ緑の線、朱色の差し色、淡い紅の塗り）に合わせた、素朴な線画。
 * 画面のカード（SVG）と保存するPNG（Canvas に描画）の両方で使う。
 */
import type { CallRecord } from '../types'

// 色（カードの世界観に合わせた、くすんだやさしい色）
const L = '#4f7a70' // 線
const SAGE = '#8fb3a6'
const SAGE_L = '#d3e3dc'
const CREAM = '#fbf5e9'
const PEACH = '#f1dccf'
const TERRA = '#c9785b'
const MUSTARD = '#e3b65e'
const SKY = '#d4e6ec'
const WOOD = '#b07a4f'

/** 角の丸い四角の中に描く、小さな情景（はみ出しは切り取る） */
const scene = (key: string, bg: string, body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" stroke="${L}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
  `<defs><clipPath id="clip-${key}"><rect x="4" y="4" width="112" height="112" rx="24"/></clipPath>${defs}</defs>` +
  `<g clip-path="url(#clip-${key})"><rect x="4" y="4" width="112" height="112" fill="${bg}" stroke="none"/>${body}</g>` +
  `<rect x="4" y="4" width="112" height="112" rx="24" stroke="${L}" stroke-width="2" opacity=".35"/></svg>`

const dots = (pts: number[][], r: number, fill: string, stroke = 'none') =>
  pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`).join('')

export type IllustrationKey =
  | 'rain'
  | 'thunder'
  | 'sunny'
  | 'night'
  | 'snow'
  | 'cloudy'
  | 'food'
  | 'laugh'
  | 'scene'
  | 'music'
  | 'place'
  | 'passion'
  | 'hourglass'
  | 'payphone'

export const ILLUSTRATIONS: Record<IllustrationKey, { label: string; svg: string }> = {
  rain: {
    label: '雨の窓',
    svg: scene(
      'rain',
      PEACH,
      `<path d="M14 12h20v66q-12 6-20 0z" fill="${TERRA}"/><path d="M106 12H86v66q12 6 20 0z" fill="${TERRA}"/>` +
        `<rect x="32" y="14" width="56" height="64" rx="4" fill="#a7c2cf"/><path d="M60 14v64M32 46h56" stroke="${CREAM}" stroke-width="3.5"/>` +
        `<path d="M40 20l-3 8M52 26l-3 8M70 20l-3 8M81 28l-3 8M42 52l-3 8M54 60l-3 8M74 54l-3 8" stroke="#ffffff" stroke-width="2"/>` +
        `<rect x="22" y="78" width="76" height="7" rx="3" fill="${CREAM}"/>` +
        `<path d="M70 94h16l-2 16H72z" fill="${TERRA}"/><path d="M78 94q-10-8-5-17q6 7 5 17q1-11 11-14q1 10-11 14" fill="${SAGE}"/>`,
    ),
  },
  thunder: {
    label: '雷雲',
    svg: scene(
      'thunder',
      '#d7dce6',
      `<path d="M30 54a13 13 0 0 1 8-24 20 20 0 0 1 36-6 15 15 0 0 1 26 10 13 13 0 0 1-4 20z" fill="#aab4c4"/>` +
        `<path d="M16 62a12 12 0 0 1 6-22 18 18 0 0 1 32-6 13 13 0 0 1 20 14 10 10 0 0 1-2 14z" fill="${CREAM}"/>` +
        `<path d="M56 60l-8 16h10l-6 18 18-24H60l6-10z" fill="${MUSTARD}" stroke="${TERRA}"/>` +
        `<path d="M28 74l-3 7M38 84l-3 7M86 70l-3 7M98 82l-3 7" stroke="#6f94ab"/>` +
        `<path d="M4 110h112v8H4z" fill="${SAGE}" stroke="none"/><path d="M70 110V96l11-9 11 9v14z" fill="${PEACH}"/><rect x="77" y="99" width="8" height="7" fill="${MUSTARD}" stroke-width="1.5"/>`,
    ),
  },
  sunny: {
    label: '太陽と鳥',
    svg: scene(
      'sunny',
      SKY,
      `<circle cx="84" cy="32" r="13" fill="${MUSTARD}" stroke="${TERRA}"/>` +
        `<path d="M84 12v-4M84 56v-4M64 32h-4M108 32h-4M70 18l-3-3M101 49l-3-3M98 18l3-3M70 46l-3 3" stroke="${MUSTARD}" stroke-width="3"/>` +
        `<path d="M18 40a7 7 0 0 1 8-9 10 10 0 0 1 18 2 6 6 0 0 1 1 11H21a5 5 0 0 1-3-4z" fill="${CREAM}" stroke-width="2"/>` +
        `<path d="M48 54q4-4 8 0q4-4 8 0M36 62q3-3 6 0q3-3 6 0" stroke-width="2"/>` +
        `<path d="M4 90q30-20 60-6t52-4v36H4z" fill="${SAGE_L}" stroke="none"/><path d="M4 100q34-16 66-4t46 0v20H4z" fill="${SAGE}"/>` +
        `<path d="M28 98V86"/><circle cx="28" cy="80" r="9" fill="#6f9a8a"/>`,
    ),
  },
  night: {
    label: '月と草むら',
    svg: scene(
      'night',
      '#3f4a63',
      `<path d="M80 16a20 20 0 1 0 18 32a16 16 0 0 1-18-32z" fill="#f3e3b0" stroke="none"/>` +
        dots([[24, 24], [44, 16], [56, 40], [30, 50], [104, 66], [96, 22]], 1.6, CREAM) +
        `<path d="M40 30l1.6 3.4 3.6.6-2.6 2.6.6 3.6-3.2-1.8-3.2 1.8.6-3.6-2.6-2.6 3.6-.6z" fill="${CREAM}" stroke="none"/>` +
        `<path d="M4 94q28-12 56-4t56-2v28H4z" fill="#2c3547" stroke="none"/>` +
        `<path d="M14 108q4-12 2-20M22 110q2-14 8-20M34 108q-2-10 3-18M86 108q3-12 0-20M96 110q-1-12 6-18M106 108q-3-9 0-16" stroke="${SAGE}" stroke-width="2.2"/>` +
        dots([[50, 82], [70, 74], [62, 92]], 2, MUSTARD),
    ),
  },
  snow: {
    label: '雪の街灯',
    svg: scene(
      'snow',
      '#c9d6de',
      `<circle cx="60" cy="44" r="24" fill="${MUSTARD}" opacity=".35" stroke="none"/>` +
        `<path d="M60 104V46M52 104h16" stroke-width="3"/><path d="M60 32v-6"/><path d="M48 44h24l-5-12H53z" fill="${CREAM}"/>` +
        `<circle cx="60" cy="47" r="4" fill="${MUSTARD}" stroke="${TERRA}" stroke-width="1.5"/>` +
        `<path d="M4 100q28-8 56-2t56-2v20H4z" fill="#ffffff" stroke-width="2"/>` +
        dots([[22, 26], [94, 20], [32, 58], [98, 54], [18, 84], [88, 82], [42, 14], [80, 40], [70, 70], [26, 44]], 2.6, '#ffffff'),
    ),
  },
  cloudy: {
    label: '雲',
    svg: scene(
      'cloudy',
      '#dfe7e4',
      `<circle cx="84" cy="34" r="12" fill="${MUSTARD}" stroke="${TERRA}"/>` +
        `<path d="M26 64a14 14 0 0 1 6-26 20 20 0 0 1 36-4 15 15 0 0 1 22 12 11 11 0 0 1-3 18z" fill="${CREAM}"/>` +
        `<path d="M56 90a9 9 0 0 1 4-17 13 13 0 0 1 24-3 10 10 0 0 1 14 9 8 8 0 0 1-2 11z" fill="#ffffff"/>` +
        `<path d="M4 106l12-8 12 8 10-6 12 6 14-10 14 10 12-7 12 7 14-8v26H4z" fill="${SAGE_L}" stroke-width="2"/>`,
    ),
  },
  food: {
    label: '湯気の立つ器',
    svg: scene(
      'food',
      PEACH,
      `<path d="M4 96h112v24H4z" fill="#e7c9b6" stroke="none"/>` +
        `<path d="M46 48q-5-7 0-14t0-14M60 46q-5-7 0-14t0-14M74 48q-5-7 0-14t0-14" stroke="#ffffff" stroke-width="3"/>` +
        `<path d="M24 62h72a36 36 0 0 1-72 0z" fill="${CREAM}"/><path d="M29 76h62" stroke="${TERRA}" stroke-width="4"/><path d="M48 98h24" stroke-width="3"/>` +
        `<ellipse cx="60" cy="62" rx="36" ry="6" fill="${MUSTARD}"/><circle cx="50" cy="61" r="4" fill="#ffffff" stroke-width="1.5"/><circle cx="50" cy="61" r="1.6" fill="${MUSTARD}" stroke="none"/>` +
        `<path d="M66 60q4-3 8 0" stroke="${SAGE}" stroke-width="3"/><path d="M80 58l30-30M86 60l28-26" stroke="${WOOD}" stroke-width="3"/>`,
    ),
  },
  laugh: {
    label: 'ふたつのマグカップ',
    svg: scene(
      'laugh',
      '#f3e2cf',
      `<path d="M4 92h112v28H4z" fill="#e2c7ad" stroke="none"/>` +
        `<path d="M57 30c-3-5-10-2-7 4l7 6 7-6c3-6-4-9-7-4z" fill="${TERRA}" stroke="none"/>` +
        `<path d="M34 46q-5-7 0-12M80 50q-5-7 0-12" stroke="#ffffff" stroke-width="3"/>` +
        `<rect x="18" y="52" width="32" height="38" rx="6" fill="${SAGE}"/><path d="M50 60h5a8 8 0 0 1 0 16h-5" stroke-width="3"/>` +
        `<rect x="66" y="56" width="30" height="34" rx="6" fill="${TERRA}"/><path d="M96 64h5a7 7 0 0 1 0 14h-5" stroke-width="3"/>` +
        `<path d="M24 62h20M72 66h18" stroke="${CREAM}" stroke-width="2" opacity=".7"/>`,
    ),
  },
  scene: {
    label: '夕焼けの帰り道',
    svg: scene(
      'scene',
      'url(#g-scene)',
      `<circle cx="60" cy="72" r="18" fill="${TERRA}" stroke="none" opacity=".9"/>` +
        `<path d="M4 74q20-14 36-6t30-4 46 6v8H4z" fill="#c99486" stroke="none"/><path d="M4 78h112v40H4z" fill="#7f9a86" stroke="none"/>` +
        `<path d="M50 118l8-40h4l8 40z" fill="#e2d5bf" stroke-width="2"/>` +
        `<path d="M8 78v-10l8-6 8 6v10z" fill="#5d4a45" stroke="none"/>` +
        `<path d="M96 30v64M88 36h16M90 44h12" stroke="#3a2e28" stroke-width="2.6"/><path d="M24 56v22M20 60h8" stroke="#3a2e28" stroke-width="2"/>` +
        `<path d="M96 36q-36 12-72 22M96 44q-36 12-72 20" stroke="#3a2e28" stroke-width="1.1"/>`,
      `<linearGradient id="g-scene" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eeb08a"/><stop offset="1" stop-color="#f6e0c6"/></linearGradient>`,
    ),
  },
  music: {
    label: 'ラジカセと音符',
    svg: scene(
      'music',
      SAGE_L,
      `<path d="M30 46v-8h60v8" stroke-width="3"/><path d="M88 38l14-22"/><circle cx="102" cy="16" r="2.5" fill="${L}"/>` +
        `<rect x="14" y="46" width="92" height="52" rx="9" fill="${TERRA}"/>` +
        `<circle cx="36" cy="74" r="13" fill="${CREAM}"/><circle cx="84" cy="74" r="13" fill="${CREAM}"/><circle cx="36" cy="74" r="5" fill="${SAGE}" stroke-width="1.5"/><circle cx="84" cy="74" r="5" fill="${SAGE}" stroke-width="1.5"/>` +
        `<rect x="50" y="56" width="20" height="12" rx="2" fill="${CREAM}" stroke-width="1.8"/><path d="M26 98v6M94 98v6" stroke-width="3"/>` +
        `<path d="M46 34V22l12-3v12" stroke-width="2.2"/><circle cx="43.5" cy="35" r="3.5" fill="${MUSTARD}" stroke-width="1.5"/><circle cx="55.5" cy="31" r="3.5" fill="${MUSTARD}" stroke-width="1.5"/>` +
        `<path d="M22 32V20" stroke-width="2.2"/><circle cx="19.5" cy="33" r="3.2" fill="${TERRA}" stroke-width="1.5"/>`,
    ),
  },
  place: {
    label: '街角のお店',
    svg: scene(
      'place',
      SKY,
      `<path d="M4 100h112v20H4z" fill="#d9cbb4" stroke="none"/>` +
        `<rect x="20" y="44" width="80" height="56" fill="${CREAM}"/>` +
        `<path d="M20 30h80l6 14H14z" fill="${TERRA}"/><path d="M33 30h14l-2 14H29zM60 30h13l2 14H60zM87 30h13l6 14H91z" fill="${CREAM}" stroke="none"/><path d="M20 30h80l6 14H14z"/>` +
        `<rect x="44" y="16" width="32" height="10" rx="2" fill="${MUSTARD}" stroke-width="2"/>` +
        `<rect x="28" y="62" width="18" height="38" rx="2" fill="${SAGE}"/><circle cx="42" cy="82" r="1.4" fill="${L}"/>` +
        `<rect x="56" y="58" width="36" height="24" rx="2" fill="${MUSTARD}"/><path d="M74 58v24M56 70h36" stroke-width="1.8"/>` +
        `<path d="M98 100v-8h12v8z" fill="${TERRA}" stroke-width="2"/><path d="M104 92q-6-6-2-12q5 5 2 12q2-8 8-9q-1 8-8 9" fill="${SAGE}" stroke-width="2"/>`,
    ),
  },
  passion: {
    label: '紙ひこうき',
    svg: scene(
      'passion',
      '#dbe9ee',
      `<path d="M14 92a6 6 0 0 1 6-8 9 9 0 0 1 16 1 5 5 0 0 1 1 9H17a4 4 0 0 1-3-2z" fill="#ffffff" stroke-width="2"/>` +
        `<path d="M10 100q26 10 46-10" stroke="${TERRA}" stroke-width="2.5" stroke-dasharray="4 6"/>` +
        `<path d="M14 58l92-34-30 74-16-26z" fill="${CREAM}"/><path d="M60 72L106 24 60 62z" fill="${PEACH}" stroke-width="2"/>` +
        `<path d="M94 82l2.6 5.4 6 .8-4.4 4.2 1 6-5.2-2.8-5.4 2.8 1-6-4.4-4.2 6-.8z" fill="${MUSTARD}" stroke="${TERRA}" stroke-width="1.5"/>`,
    ),
  },
  hourglass: {
    label: '砂時計',
    svg: scene(
      'hourglass',
      '#e9dcc8',
      dots([[18, 24], [104, 30], [100, 92], [16, 86], [26, 56]], 1.8, TERRA) +
        `<path d="M42 20c0 24 16 30 16 40s-16 16-16 40h36c0-24-16-30-16-40s16-16 16-40z" fill="${CREAM}"/>` +
        `<path d="M47 30h26c-2 10-10 14-13 20-3-6-11-10-13-20z" fill="${MUSTARD}" stroke="none"/><path d="M60 60v24" stroke="${MUSTARD}" stroke-width="1.6"/>` +
        `<path d="M46 100c2-10 8-14 14-16 6 2 12 6 14 16z" fill="${MUSTARD}" stroke="none"/>` +
        `<path d="M36 20v80M84 20v80" stroke="${WOOD}" stroke-width="3"/><rect x="30" y="12" width="60" height="8" rx="3" fill="${WOOD}"/><rect x="30" y="100" width="60" height="8" rx="3" fill="${WOOD}"/>`,
    ),
  },
  payphone: {
    label: '公衆電話',
    svg: scene(
      'payphone',
      SAGE_L,
      `<rect x="34" y="16" width="56" height="90" rx="10" fill="${SAGE}"/><rect x="42" y="24" width="40" height="14" rx="3" fill="#dfe8c9" stroke-width="2"/>` +
        `<path d="M26 34q-7 26 0 52" stroke="#3f5a52" stroke-width="7"/>` +
        [0, 1, 2]
          .flatMap((r) => [0, 1, 2].map((c) => `<rect x="${45 + c * 12}" y="${46 + r * 12}" width="8" height="8" rx="2" fill="${CREAM}" stroke-width="1.2"/>`))
          .join('') +
        `<rect x="66" y="94" width="18" height="4" rx="2" fill="${TERRA}" stroke="none"/>`,
    ),
  },
}

/**
 * 通話の内容から挿絵を選ぶ。
 * 1. 10年前・100年後の特別な回 → 砂時計
 * 2. 「最近の◯◯」で「あるよ」と答えた → その話題の絵
 * 3. 天気 → 天気の絵
 * 4. それ以外 → 公衆電話
 */
export function pickIllustration(r: Pick<CallRecord, 'years' | 'topic' | 'answers' | 'weather'>): IllustrationKey {
  const y = r.years ?? 10
  if (y < 0 || y >= 100) return 'hourglass'
  const answeredTopic = r.answers.some((a) => a.key === 'topicText' && a.answer && a.answer !== '（書かなかった）')
  const saidYes = r.answers.some((a) => a.key === 'topicYN' && a.answer === 'あるよ')
  if (r.topic && (answeredTopic || saidYes) && r.topic in ILLUSTRATIONS) return r.topic as IllustrationKey
  const w = r.weather
  if (w) {
    if (w.kind === 'rain') return 'rain'
    if (w.kind === 'thunder') return 'thunder'
    if (w.kind === 'snow') return 'snow'
    if (w.kind === 'clear') return w.isDay ? 'sunny' : 'night'
    return 'cloudy'
  }
  return 'payphone'
}

export function illustrationOf(r: CallRecord): IllustrationKey {
  return (r.illustration as IllustrationKey | undefined) ?? pickIllustration(r)
}

/** Canvas に描くための画像（data URL の SVG） */
export function loadIllustration(key: IllustrationKey): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ILLUSTRATIONS[key].svg)
  })
}
