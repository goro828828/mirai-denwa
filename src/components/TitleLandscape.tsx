/**
 * タイトル画面の背景：山と田んぼの中に、ぽつんと公衆電話。街灯が照らしている。
 *
 * 切り替わるもの
 * - 時間帯（朝・昼・夕方・夜）：空の色、太陽・月・星、街灯と電話ボックスの明かり
 * - 天気（晴れ・くもり・雨・雷雨・雪）：雲、雨・雪・稲光。雪の日は、田んぼと山に雪が積もる
 * - 季節：春＝水を張った田んぼと苗／夏＝青々とした稲／秋＝実った稲穂／冬＝刈り取ったあとの何もない田んぼ
 *
 * 3枚の層でできている
 * - 空（画面いっぱい）：空の色、太陽・月・星、雲、稲光
 * - 地面（画面の下 約6割）：真横から見た平面的な構図。座標は横 1000 × 縦 380〜900。
 *     上から 山 → 奥の田んぼ → 草の路肩 → 横一本の道 → 手前の田んぼ。
 *     電話ボックス・街灯・電柱は、道の奥側の路肩に立っている。
 *   スマホでは横 240〜760 あたりが見える。主役（電話と街灯）は真ん中の x=520〜640 に置く。
 * - 動き：街灯に寄ってくる虫（明かりがついているとき）、昼の空を右から左へ横切るカラス
 * - 雨・雪（画面いっぱい、いちばん手前）
 * 公衆電話は特定の実在の機種を模したものではない。
 */
import type { WeatherKind } from '../types'
import type { TimeOfDay } from '../lib/weather'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export function seasonOf(d = new Date()): Season {
  const m = d.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

/** 街灯がつくのは、夕方・夜と、雨や雷で暗い日 */
export function lampOn(tod: TimeOfDay, weather: WeatherKind | null): boolean {
  return tod === 'evening' || tod === 'night' || weather === 'rain' || weather === 'thunder'
}

/** 空が暗く、文字を明るくしたほうが読みやすいとき */
export function skyIsDark(tod: TimeOfDay, weather: WeatherKind | null): boolean {
  return tod === 'evening' || tod === 'night' || weather === 'thunder'
}

type Sky = [string, string, string]
function skyColors(tod: TimeOfDay, w: WeatherKind | null): Sky {
  const night = tod === 'night'
  const eve = tod === 'evening'
  if (w === 'thunder') return night ? ['#10131c', '#22283a', '#353b4e'] : ['#4a5260', '#6b7380', '#8d949c']
  if (w === 'rain') return night ? ['#141a28', '#262e40', '#3a4254'] : eve ? ['#4f5470', '#7a7286', '#a88d8a'] : ['#8b98a3', '#aab4bb', '#c9cfd0']
  if (w === 'snow') return night ? ['#252d40', '#3d4760', '#5f6a80'] : eve ? ['#6b6f8c', '#a99fae', '#d6c7c4'] : ['#b8c3cc', '#d4dbe0', '#eef1f2']
  if (w === 'cloudy') return night ? ['#151b2b', '#262f45', '#3b4560'] : eve ? ['#5c6386', '#a08a96', '#d6a98f'] : ['#9fb0bd', '#c3ced4', '#e2e6e4']
  if (night) return ['#0b1330', '#18264d', '#2c3d6b']
  if (eve) return ['#3f4f86', '#d98468', '#f7c58a']
  if (tod === 'morning') return ['#8fbfe0', '#c8dfe9', '#f7dcc0']
  return ['#5fa3d6', '#9cc9e6', '#d8edf3']
}

/** 星（固定の位置。毎回同じ空） */
const STARS = [
  [320, 70, 1.6], [365, 150, 1.1], [410, 40, 1.3], [455, 120, 1.8], [500, 60, 1], [540, 170, 1.2], [585, 90, 1.5], [630, 30, 1.1],
  [670, 140, 1.3], [700, 60, 1.7], [345, 230, 1], [430, 260, 1.2], [610, 250, 1], [690, 220, 1.2], [380, 320, 0.9], [660, 330, 1],
  [480, 300, 0.8], [560, 310, 1.1], [300, 380, 0.9], [710, 400, 0.9], [150, 120, 1.4], [220, 260, 1.1], [820, 110, 1.4], [900, 240, 1.2],
] as const

/** 雨・雪の粒（固定の位置） */
const DROPS = Array.from({ length: 70 }, (_, i) => [((i * 137) % 1000) + 0.5, (i * 71) % 900, 0.6 + ((i * 29) % 10) / 14] as const)
/** 切れ目なく降らせるため、1画面ぶん上にも同じ粒を置き、900 下へ動かしてループする */
const LOOP = [...DROPS, ...DROPS.map(([x, y, r]) => [x, y - 900, r] as const)]

const GROUND: Record<Season | 'snow', { water: string; rice: string; riceDark: string; verge: string; far: string; near: string; road: string }> = {
  spring: { water: '#b4d2d8', rice: '#7fb05a', riceDark: '#6a9c49', verge: '#93b968', far: '#a7bf8f', near: '#7fa56a', road: '#b9a98c' },
  summer: { water: '#4f8f3c', rice: '#63a34a', riceDark: '#4b8a38', verge: '#7dae55', far: '#6f9f72', near: '#4f8352', road: '#b5a385' },
  autumn: { water: '#c9a043', rice: '#e0b84f', riceDark: '#c99a33', verge: '#a5a25e', far: '#b9926a', near: '#9c6a45', road: '#b8a283' },
  winter: { water: '#a58c6a', rice: '#8f7757', riceDark: '#7c6649', verge: '#a59a72', far: '#9a9580', near: '#7c7766', road: '#a8997f' },
  snow: { water: '#f3f6f8', rice: '#e6ecf0', riceDark: '#d6dfe6', verge: '#eef2f5', far: '#e3e9ee', near: '#ccd6de', road: '#dfe5ea' },
}

/** 遠くの山・近くの山の形 */
const FAR = 'M0 540 L0 460 Q90 410 180 440 Q260 392 340 430 Q420 360 520 422 Q600 382 680 430 Q770 392 860 435 Q930 410 1000 450 L1000 540 Z'
const NEAR = 'M0 570 L0 494 Q120 456 230 494 Q330 466 420 512 Q520 486 610 516 Q720 478 830 510 Q920 492 1000 506 L1000 570 Z'

/** 横一本の帯（上から順に） */
const Y = {
  paddyTop: 548, // 奥の田んぼ
  aze: 590, // 田んぼのあいだの畦（平らな帯）
  verge: 626, // 道の奥側の路肩（電話や電柱が立つ）
  road: 648, // 道
  roadEnd: 684,
  front: 692, // 手前の田んぼ
}

/** 電話ボックス・街灯・電柱（すべて路肩に立つ） */
const BASE = 642
const BOOTH = { x: 524, w: 68, h: 120 }
const POLE = { x: 626, top: 470 }
const LAMP = { x: 592, y: 498 }
const POLES = [330, 860]

/** 稲の頭（丸いふくらみ）を横に並べた、平らな形 */
function bumps(y: number, depth: number, step: number, h: number, offset = 0): string {
  let d = `M-20 ${y + depth} L-20 ${y}`
  for (let x = -20 + offset; x < 1020; x += step) d += ` Q${x + step / 2} ${y - h} ${x + step} ${y}`
  return d + ` L1020 ${y + depth} Z`
}

/** 春の苗（小さな三角の株を並べる） */
function seedlings(y: number, step: number, size: number, offset = 0): string {
  let d = ''
  for (let x = offset; x < 1000; x += step) d += `M${x - size * 0.6} ${y}L${x} ${y - size * 1.4}L${x + size * 0.6} ${y}Z`
  return d
}

/** 冬の切り株（小さな四角を並べる） */
function stubble(y: number, step: number, w: number, h: number, offset = 0): string {
  let d = ''
  for (let x = offset; x < 1000; x += step) d += `M${x} ${y}h${w}v-${h}h-${w}Z`
  return d
}

/** 虫：街灯のまわりを回る（それぞれの軌道） */
const MOTHS = [
  { r: 1.8, cls: 'm1' },
  { r: 1.5, cls: 'm2' },
  { r: 1.3, cls: 'm3' },
  { r: 1.6, cls: 'm4' },
  { r: 1.2, cls: 'm5' },
]

/** カラス（左向き。翼は別に動かす） */
function Crow({ cls, y, scale }: { cls: string; y: number; scale: number }) {
  return (
    <g className={`tl-crow ${cls}`} style={{ ['--y' as string]: `${y}px` }}>
      <g transform={`scale(${scale})`} fill="#26252b">
        <ellipse cx="0" cy="0" rx="13" ry="5" />
        <circle cx="-12" cy="-2" r="4.5" />
        <path d="M-16 -2 l-6 1.5 l6 1.5 z" />
        <path d="M11 -1 l10 -4 l-2 5 l2 4 z" />
        <path className="tl-wing" d="M-4 -2 Q2 -20 14 -22 Q8 -10 6 -1 z" />
      </g>
    </g>
  )
}

/**
 * 電話ボックスの足もとが、画面の上から targetY（px）に来る地面の高さ（px）。
 * 地面の絵は viewBox「0 380 1000 520」を xMidYMin slice で敷いている。
 */
export function groundHeightFor(W: number, H: number, targetY: number): number {
  const foot = BASE - 380 // 地面の絵の上端から、足もとまで
  // 絵の高さで倍率が決まるとき：足もと = H - h + foot * h / 520
  let h = (H - targetY) / (1 - foot / 520)
  // 絵の幅で倍率が決まるとき：足もと = H - h + foot * W / 1000
  if (h < (520 * W) / 1000) h = H - targetY + (foot * W) / 1000
  return Math.min(H * 0.85, Math.max(H * 0.5, h))
}

export function TitleLandscape({
  tod,
  weather,
  season,
}: {
  tod: TimeOfDay
  weather: WeatherKind | null
  season: Season
}) {
  const snowy = weather === 'snow'
  const g = GROUND[snowy ? 'snow' : season]
  const [s0, s1, s2] = skyColors(tod, weather)
  const night = tod === 'night'
  const lamp = lampOn(tod, weather)
  const clear = weather === 'clear' || weather === null
  const overcast = weather === 'cloudy' || weather === 'rain' || weather === 'thunder' || weather === 'snow'
  // カラスは、昼間（朝・昼）で、雨・雷・雪でないとき
  const crows = (tod === 'morning' || tod === 'day') && (weather === null || weather === 'clear' || weather === 'cloudy')
  // 地面にかける色（時間帯と天気）
  const shade = night
    ? 'rgba(10,18,42,0.6)'
    : tod === 'evening'
      ? 'rgba(120,60,70,0.26)'
      : weather === 'thunder'
        ? 'rgba(30,36,50,0.36)'
        : weather === 'rain'
          ? 'rgba(60,70,85,0.2)'
          : tod === 'morning'
            ? 'rgba(255,200,160,0.1)'
            : 'rgba(0,0,0,0)'
  const frame = night ? '#5c7869' : '#7fa391'
  const roof = night ? '#4a6356' : '#6a8e7c'
  const B = { ...BOOTH, y: BASE - BOOTH.h }
  const wood = '#6b5546'

  /** 季節ごとの、田んぼの帯（top〜bottom） */
  const paddy = (top: number, bottom: number, big: boolean, key: string) => {
    const k = big ? 1.8 : 1
    if (snowy)
      return (
        <g key={key}>
          <rect x="0" y={top} width="1000" height={bottom - top} fill={g.water} />
          <path d={bumps(top + 4, bottom - top - 4, 90 * k, 6 * k)} fill={g.riceDark} opacity="0.55" />
        </g>
      )
    if (season === 'spring')
      // 水を張った田んぼ（空が映る）に、小さな苗が並ぶ
      return (
        <g key={key}>
          <rect x="0" y={top} width="1000" height={bottom - top} fill={g.water} />
          <rect x="0" y={top} width="1000" height={(bottom - top) * 0.5} fill={s1} opacity="0.35" />
          <path d={seedlings(top + (bottom - top) * 0.45, 22 * k, 3.2 * k, 6)} fill={g.rice} />
          <path d={seedlings(top + (bottom - top) * 0.9, 22 * k, 3.8 * k, 17)} fill={g.riceDark} />
        </g>
      )
    if (season === 'winter')
      // 刈り取ったあとの、何もない田んぼ
      return (
        <g key={key}>
          <rect x="0" y={top} width="1000" height={bottom - top} fill={g.water} />
          <path d={stubble(top + (bottom - top) * 0.45, 26 * k, 3 * k, 4 * k, 8)} fill={g.riceDark} />
          <path d={stubble(top + (bottom - top) * 0.85, 26 * k, 3.4 * k, 5 * k, 21)} fill={g.riceDark} />
        </g>
      )
    // 夏：青々とした稲／秋：実って頭を垂れる稲穂。丸いふくらみを重ねた平らな形
    return (
      <g key={key}>
        <rect x="0" y={top} width="1000" height={bottom - top} fill={g.water} />
        <path d={bumps(top + 6 * k, bottom - top, 20 * k, 9 * k)} fill={g.riceDark} />
        <path d={bumps(top + 12 * k, bottom - top, 24 * k, 10 * k, 9)} fill={g.rice} />
        {season === 'autumn' && <path d={bumps(top + 24 * k, bottom - top, 18 * k, 7 * k, 4)} fill={g.riceDark} opacity="0.55" />}
      </g>
    )
  }

  return (
    <div className={`title-landscape season-${season} w-${weather ?? 'none'} t-${tod}`} aria-hidden="true">
      {/* 空 */}
      <div className="tl-layer" style={{ background: `linear-gradient(180deg, ${s0} 0%, ${s1} 28%, ${s2} 52%, ${s2} 100%)` }} />
      <svg className="tl-layer" viewBox="0 0 1000 900" preserveAspectRatio="xMidYMin slice">
        <defs>
          <radialGradient id="tl-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff6dc" stopOpacity="1" />
            <stop offset="0.5" stopColor="#ffe7b0" stopOpacity="0.6" />
            <stop offset="1" stopColor="#ffe7b0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {night && !(weather === 'rain' || weather === 'thunder' || weather === 'snow') && (
          <g className="tl-stars">
            {STARS.filter((_, i) => clear || i % 4 === 0).map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r * 1.4} fill="#fff8e0" opacity={0.85} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
            ))}
            {clear && (
              <g transform="translate(650 120)">
                <circle r="30" fill="#fff3c8" opacity="0.16" />
                <path d="M8-20a21 21 0 1 0 12 32a17 17 0 1 1-12-32z" fill="#fbecc0" />
              </g>
            )}
          </g>
        )}
        {clear && tod === 'day' && (
          <g>
            <circle cx="380" cy="120" r="80" fill="url(#tl-sun)" />
            <circle cx="380" cy="120" r="24" fill="#fff6dc" />
          </g>
        )}
        {clear && tod === 'morning' && (
          <g>
            <circle cx="660" cy="200" r="100" fill="url(#tl-sun)" />
            <circle cx="660" cy="200" r="24" fill="#fff0cf" />
          </g>
        )}
        {clear && !night && (
          <g fill="#ffffff" opacity={tod === 'evening' ? 0.3 : 0.7}>
            <ellipse cx="560" cy="60" rx="60" ry="14" />
            <ellipse cx="595" cy="50" rx="34" ry="14" />
            <ellipse cx="330" cy="230" rx="46" ry="10" />
            <ellipse cx="740" cy="300" rx="56" ry="12" />
          </g>
        )}
        {overcast && (
          <g fill={night ? '#3c4559' : weather === 'thunder' ? '#59606d' : tod === 'evening' ? (weather === 'snow' ? '#9d95ab' : '#857d96') : weather === 'snow' ? '#e7ebee' : '#dfe4e7'} opacity={night ? 0.7 : 0.72}>
            <ellipse cx="300" cy="60" rx="170" ry="48" />
            <ellipse cx="480" cy="30" rx="160" ry="52" />
            <ellipse cx="700" cy="70" rx="190" ry="50" />
            <ellipse cx="420" cy="170" rx="150" ry="36" />
            <ellipse cx="660" cy="200" rx="140" ry="34" />
            <ellipse cx="880" cy="140" rx="160" ry="44" />
            <ellipse cx="120" cy="180" rx="150" ry="40" />
            {weather !== 'cloudy' && <ellipse cx="540" cy="300" rx="240" ry="34" opacity="0.6" />}
          </g>
        )}
        {weather === 'thunder' && (
          <g>
            <rect className="tl-flash" width="1000" height="900" fill="#e8ecff" />
            <path className="tl-bolt" d="M650 60l-34 92h26l-30 96 70-118h-28l26-70z" fill="#fff8d6" />
          </g>
        )}
        {/* 昼の空を、右から左へ横切るカラス */}
        {crows && (
          <g>
            <Crow cls="c1" y={250} scale={1.5} />
            <Crow cls="c2" y={285} scale={1.2} />
          </g>
        )}
      </svg>

      {/* 地面：真横から見た、横一本の構図 */}
      <svg className="tl-ground" viewBox="0 380 1000 520" preserveAspectRatio="xMidYMin slice">
        <defs>
          <radialGradient id="tl-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe7a6" stopOpacity="0.85" />
            <stop offset="0.45" stopColor="#ffd98a" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="tl-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1c2" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffe3a0" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* 夕日（山に沈みかけている） */}
        {clear && tod === 'evening' && (
          <g>
            <circle cx="400" cy="470" r="150" fill="#ffc98a" opacity="0.35" />
            <circle cx="400" cy="470" r="34" fill="#ffb066" />
          </g>
        )}

        {/* 山 */}
        <path d={FAR} fill={g.far} />
        <path d={NEAR} fill={g.near} />
        {!snowy && (
          <g fill={season === 'autumn' ? '#c45f3a' : season === 'winter' ? '#6a6556' : season === 'spring' ? '#e7b9c4' : '#3f7344'} opacity={season === 'spring' ? 0.85 : 0.55}>
            {[250, 300, 350, 400, 660, 720, 780, 840].map((x, i) => (
              <circle key={x} cx={x} cy={508 + (i % 3) * 6} r={season === 'spring' ? 9 : 12} />
            ))}
          </g>
        )}
        <path d={FAR} fill={shade} />
        <path d={NEAR} fill={shade} />

        {/* 奥の田んぼ（2枚）と、そのあいだの畦 */}
        {paddy(Y.paddyTop, Y.aze, false, 'p1')}
        <rect x="0" y={Y.aze} width="1000" height="6" fill={g.verge} />
        {paddy(Y.aze + 6, Y.verge, false, 'p2')}

        {/* 路肩・道・手前の田んぼ（どれも横一本） */}
        <rect x="0" y={Y.verge} width="1000" height={Y.road - Y.verge} fill={g.verge} />
        <rect x="0" y={Y.road} width="1000" height={Y.roadEnd - Y.road} fill={g.road} />
        <rect x="0" y={Y.road + 2} width="1000" height="3" fill="#000" opacity="0.06" />
        <rect x="0" y={Y.roadEnd} width="1000" height={Y.front - Y.roadEnd} fill={g.verge} />
        {paddy(Y.front, 900, true, 'p3')}

        {/* 電線 */}
        <path
          d={`M-20 ${POLE.top + 34} Q160 ${POLE.top + 58} ${POLES[0] + 4} ${POLE.top + 24} Q${(POLES[0] + POLE.x) / 2} ${POLE.top + 54} ${POLE.x + 4} ${POLE.top + 12} Q${(POLE.x + POLES[1]) / 2} ${POLE.top + 48} ${POLES[1] + 4} ${POLE.top + 24} Q960 ${POLE.top + 52} 1020 ${POLE.top + 34}`}
          stroke="#3d3a3a"
          strokeWidth="1.4"
          fill="none"
          opacity="0.75"
        />

        {/* 田んぼ・道に、時間帯・天気の色をかける */}
        <rect x="0" y={Y.paddyTop} width="1000" height={900 - Y.paddyTop} fill={shade} />

        {/* 電柱（路肩に立つ）。街灯の柱と同じ、木の色の単色。地面の色かけより手前に描いて、色がまだらにならないようにする */}
        {POLES.map((x) => (
          <g key={x}>
            <rect x={x} y={POLE.top + 10} width="8" height={BASE - POLE.top - 10} fill={wood} />
            <rect x={x - 12} y={POLE.top + 22} width="32" height="4" fill={wood} />
          </g>
        ))}

        {/* 街灯の光 */}
        {lamp && (
          <g className="tl-lamp-light">
            <path d={`M${LAMP.x - 4} ${LAMP.y} L${LAMP.x - 88} ${BASE + 6} L${LAMP.x + 72} ${BASE + 6} Z`} fill="url(#tl-cone)" />
            <ellipse cx={LAMP.x - 8} cy={BASE + 8} rx="130" ry="20" fill="url(#tl-glow)" />
            <circle cx={LAMP.x} cy={LAMP.y} r="46" fill="url(#tl-glow)" />
          </g>
        )}

        {/* 電話ボックス（路肩に立つ） */}
        <g>
          <ellipse cx={B.x + B.w / 2} cy={BASE} rx={B.w * 0.6} ry="4" fill="#000" opacity="0.2" />
          <rect x={B.x} y={B.y + 10} width={B.w} height={B.h - 10} rx="4" fill={frame} />
          <rect x={B.x + 6} y={B.y + 24} width={B.w - 12} height={B.h - 30} rx="3" fill={lamp ? '#fae9b8' : '#d6e6e6'} opacity={lamp ? 0.96 : 0.88} />
          <rect x={B.x + B.w / 2 - 1.5} y={B.y + 24} width="3" height={B.h - 30} fill={frame} />
          <rect x={B.x + 6} y={B.y + 68} width={B.w - 12} height="3" fill={frame} />
          <rect x={B.x - 5} y={B.y} width={B.w + 10} height="14" rx="4" fill={roof} />
          <rect x={B.x + 18} y={B.y + 3} width={B.w - 36} height="8" rx="2" fill={lamp ? '#fff4cf' : '#eef2ec'} />
          <rect x={B.x + 13} y={B.y + 40} width="20" height="26" rx="3" fill="#4f8a69" />
          <rect x={B.x + 15} y={B.y + 35} width="16" height="6" rx="3" fill="#3c6b51" />
          <rect x={B.x + 17} y={B.y + 47} width="12" height="4" rx="1" fill="#dfeee5" opacity="0.8" />
          {snowy && <path d={`M${B.x - 5} ${B.y + 1} Q${B.x + B.w / 2} ${B.y - 14} ${B.x + B.w + 5} ${B.y + 1} Z`} fill="#f6f8fa" />}
        </g>

        {/* 街灯（木の電柱に、腕木と傘つきの電灯。路肩に立つ） */}
        <g>
          <rect x={POLE.x} y={POLE.top} width="9" height={BASE - POLE.top} fill={wood} />
          <rect x={POLE.x - 12} y={POLE.top + 10} width="33" height="4" fill={wood} />
          <path d={`M${POLE.x + 2} ${POLE.top + 20} L${LAMP.x + 2} ${LAMP.y - 10} L${LAMP.x + 2} ${LAMP.y - 6} L${POLE.x + 2} ${POLE.top + 25} Z`} fill={wood} />
          <path d={`M${LAMP.x - 16} ${LAMP.y - 8}h32l-7 10h-18z`} fill="#4b4141" />
          <ellipse cx={LAMP.x} cy={LAMP.y + 2} rx="8" ry="4" fill={lamp ? '#fff3c4' : '#c9c6bd'} />
          {snowy && <rect x={POLE.x - 1} y={POLE.top - 3} width="11" height="5" rx="2" fill="#f6f8fa" />}
        </g>

        {/* 街灯の光に寄ってくる虫 */}
        {lamp && !snowy && (
          <g className="tl-moths" transform={`translate(${LAMP.x} ${LAMP.y + 6})`} fill={night ? '#fff6d6' : '#f3e6c0'}>
            {MOTHS.map((m) => (
              <circle key={m.cls} className={`tl-moth ${m.cls}`} r={m.r} />
            ))}
          </g>
        )}
      </svg>

      {/* 雨・雪（いちばん手前） */}
      {(weather === 'rain' || weather === 'thunder' || snowy) && (
        <svg className="tl-layer" viewBox="0 0 1000 900" preserveAspectRatio="xMidYMin slice">
          {snowy ? (
            <g className="tl-snow" fill="#ffffff" opacity="0.9">
              {LOOP.map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r * 3} />
              ))}
            </g>
          ) : (
            <g className="tl-rain" fill={night ? '#9fb0c8' : '#eef2f6'} opacity="0.55">
              {LOOP.map(([x, y], i) => (
                <path key={i} d={`M${x} ${y}l1.4 0l-8 26l-1.4 0z`} />
              ))}
            </g>
          )}
        </svg>
      )}
    </div>
  )
}
