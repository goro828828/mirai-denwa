/**
 * テレフォンカードの挿絵（線画・13種類＋公衆電話）
 * カードの色（くすんだ緑の線、朱色の差し色、淡い紅の塗り）に合わせた、素朴な線画。
 * 画面のカード（SVG）と保存するPNG（Canvas に描画）の両方で使う。
 */
import type { CallRecord } from '../types'

const L = '#5d8a80'
const A = '#c9785b'
const F = '#f1dccf'

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

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
    svg: wrap(
      `<rect x="22" y="14" width="76" height="80" rx="6" fill="#fbf5e9"/><path d="M60 14v80M22 54h76"/>` +
        `<path d="M36 24l-4 10M50 30l-4 10M74 24l-4 10M88 30l-4 10M36 64l-4 10M50 70l-4 10M74 64l-4 10M88 70l-4 10" stroke="${A}" stroke-width="2.5"/>` +
        `<path d="M12 100h96"/><path d="M84 100v-8a6 6 0 0 1 12 0v8" fill="${F}"/>`,
    ),
  },
  thunder: {
    label: '雷雲',
    svg: wrap(
      `<path d="M30 62a16 16 0 0 1 6-30 22 22 0 0 1 40-4 16 16 0 0 1 14 34z" fill="${F}"/>` +
        `<path d="M64 64l-10 18h12l-8 22" stroke="${A}" stroke-width="4"/>` +
        `<path d="M38 72l-4 9M86 72l-4 9M44 88l-3 7M92 88l-3 7" stroke-width="2.5"/>`,
    ),
  },
  sunny: {
    label: '太陽と鳥',
    svg: wrap(
      `<circle cx="80" cy="38" r="13" fill="${A}" stroke="${A}"/>` +
        `<path d="M80 15v-6M80 67v-6M57 38h-6M109 38h-6M64 22l-4-4M100 58l-4-4M96 22l4-4M64 54l-4 4" stroke="${A}" stroke-width="2.5"/>` +
        `<path d="M18 46q6-6 12 0q6-6 12 0M34 64q4-4 8 0q4-4 8 0"/><path d="M6 104q30-22 56-8t52-4"/>`,
    ),
  },
  night: {
    label: '月と草むら',
    svg: wrap(
      `<path d="M78 16a24 24 0 1 0 22 38a20 20 0 0 1-22-38z" fill="${A}" stroke="${A}"/>` +
        `<path d="M30 22l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="${L}" stroke-width="1.5"/>` +
        `<circle cx="48" cy="46" r="1.8" fill="${L}"/><circle cx="20" cy="56" r="1.8" fill="${L}"/><circle cx="56" cy="24" r="1.8" fill="${L}"/>` +
        `<path d="M6 106h108"/><path d="M12 106q8-14 5-26M26 106q2-16 10-24M42 106q-2-12 4-20M80 106q4-14 0-24M96 106q-2-14 8-22M110 106q-4-10 0-18"/>`,
    ),
  },
  snow: {
    label: '雪の街灯',
    svg: wrap(
      `<path d="M60 104V40M48 104h24M60 26v-6"/><path d="M46 40h28l-6-14H52z" fill="${F}"/><circle cx="60" cy="47" r="5" fill="${A}" stroke="none"/>` +
        [
          [24, 30],
          [92, 24],
          [34, 62],
          [96, 58],
          [20, 86],
          [88, 86],
          [42, 14],
          [80, 44],
        ]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${L}" stroke="none"/>`)
          .join('') +
        `<path d="M8 104q52-8 104 0"/>`,
    ),
  },
  cloudy: {
    label: '雲',
    svg: wrap(
      `<path d="M88 30a12 12 0 0 1 18 10" stroke="${A}"/><path d="M24 72a14 14 0 0 1 4-27 20 20 0 0 1 38-6 14 14 0 0 1 12 33z" fill="${F}"/>` +
        `<path d="M56 94a10 10 0 0 1 3-19 15 15 0 0 1 28-4 10 10 0 0 1 9 23z" fill="#fbf5e9"/>`,
    ),
  },
  food: {
    label: '湯気の立つ器',
    svg: wrap(
      `<path d="M20 62h80a40 40 0 0 1-80 0z" fill="${F}"/><path d="M46 102h28"/>` +
        `<path d="M44 50q-6-8 0-16t0-16M60 50q-6-8 0-16t0-16M76 50q-6-8 0-16t0-16" stroke="${A}" stroke-width="2.5"/>` +
        `<path d="M74 58l34-28M80 60l30-24"/>`,
    ),
  },
  laugh: {
    label: 'ふたつのマグカップ',
    svg: wrap(
      `<rect x="16" y="48" width="34" height="40" rx="6" fill="${F}"/><path d="M50 58h6a8 8 0 0 1 0 16h-6"/>` +
        `<rect x="66" y="52" width="32" height="36" rx="6" fill="#fbf5e9"/><path d="M98 62h5a7 7 0 0 1 0 14h-5"/>` +
        `<path d="M33 40q-4-6 0-12M82 44q-4-6 0-12" stroke="${A}" stroke-width="2.5"/><path d="M6 94h108"/>`,
    ),
  },
  scene: {
    label: '夕焼けの帰り道',
    svg: wrap(
      `<path d="M38 70a22 22 0 0 1 44 0" fill="${A}" stroke="${A}"/><path d="M6 70h108"/>` +
        `<path d="M50 112l8-42M70 112l-8-42"/>` +
        `<path d="M98 30v74M90 36h16M92 44h12"/><path d="M98 36q-32 10-70 26" stroke-width="2"/><path d="M22 54v16M18 56h8" stroke-width="2"/>`,
    ),
  },
  music: {
    label: 'ラジカセと音符',
    svg: wrap(
      `<rect x="12" y="44" width="96" height="56" rx="8" fill="${F}"/><circle cx="38" cy="74" r="13" fill="#fbf5e9"/><circle cx="82" cy="74" r="13" fill="#fbf5e9"/>` +
        `<circle cx="38" cy="74" r="3" fill="${L}"/><circle cx="82" cy="74" r="3" fill="${L}"/><path d="M28 44v-8h64v8M90 36l14-22"/>` +
        `<path d="M50 26V14l14-4v12" stroke="${A}"/><circle cx="47" cy="27" r="3.5" fill="${A}" stroke="${A}"/><circle cx="61" cy="23" r="3.5" fill="${A}" stroke="${A}"/>`,
    ),
  },
  place: {
    label: '街角のお店',
    svg: wrap(
      `<path d="M20 50v52h80V50"/><path d="M14 50h92l-6-18H20z" fill="${F}"/>` +
        `<path d="M34 32l-4 18M50 32l-2 18M66 32v18M82 32l2 18M96 32l4 18" stroke="${A}" stroke-width="2.5"/>` +
        `<rect x="30" y="66" width="20" height="36" rx="2" fill="#fbf5e9"/><rect x="60" y="64" width="30" height="22" rx="2"/><path d="M8 102h104"/><path d="M46 22h28"/>`,
    ),
  },
  passion: {
    label: '紙ひこうき',
    svg: wrap(
      `<path d="M12 60l94-36-30 76-16-26z" fill="${F}"/><path d="M60 74l46-50"/>` +
        `<path d="M8 94q22 8 42-8" stroke="${A}" stroke-dasharray="4 7"/>` +
        `<path d="M94 86l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="${A}" stroke="${A}" stroke-width="1.5"/>`,
    ),
  },
  hourglass: {
    label: '砂時計',
    svg: wrap(
      `<path d="M34 12h52M34 108h52"/><path d="M40 12c0 26 18 34 18 48S40 82 40 108M80 12c0 26-18 34-18 48s18 22 18 48" fill="#fbf5e9"/>` +
        `<path d="M48 30h24l-12 18z" fill="${A}" stroke="${A}" stroke-width="2"/><path d="M46 104h28l-14-18z" fill="${A}" stroke="${A}" stroke-width="2"/>` +
        `<circle cx="18" cy="30" r="2" fill="${L}"/><circle cx="104" cy="44" r="2" fill="${L}"/><circle cx="100" cy="88" r="2" fill="${L}"/>`,
    ),
  },
  payphone: {
    label: '公衆電話',
    svg: wrap(
      `<rect x="30" y="10" width="64" height="100" rx="10" fill="${F}"/><rect x="40" y="20" width="44" height="16" rx="3" fill="#fbf5e9"/>` +
        `<path d="M22 34q-6 26 0 52" stroke-width="5"/>` +
        [0, 1, 2]
          .flatMap((r) => [0, 1, 2].map((c) => `<circle cx="${48 + c * 14}" cy="${52 + r * 14}" r="3.5" fill="${L}" stroke="none"/>`))
          .join('') +
        `<path d="M70 96h16" stroke="${A}"/>`,
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
