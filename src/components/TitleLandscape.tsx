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
 * - 地面（画面の下 約6割）：山、田んぼ、農道、電柱、電話ボックス、街灯。座標は横 1000 × 縦 380〜900。
 *   スマホでは横 240〜760 あたりが見える。主役（電話と街灯）は真ん中の x=520〜630 に置く。
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

const GROUND: Record<Season | 'snow', { field: string; dark: string; ridge: string; far: string; near: string }> = {
  spring: { field: '#a9c9cf', dark: '#8fb3ba', ridge: '#9cbf6a', far: '#a7bf8f', near: '#7fa56a' },
  summer: { field: '#5f9e48', dark: '#4c8a3b', ridge: '#87b55c', far: '#6f9f72', near: '#4f8352' },
  autumn: { field: '#d8b049', dark: '#c49a37', ridge: '#a8995c', far: '#b9926a', near: '#9c6a45' },
  winter: { field: '#a58c6a', dark: '#8f7757', ridge: '#b9a682', far: '#9a9580', near: '#7c7766' },
  snow: { field: '#f3f6f8', dark: '#dde5ea', ridge: '#e7edf1', far: '#e3e9ee', near: '#ccd6de' },
}

/** 田んぼの畦（あぜ）：手前ほど間隔が広い */
const ROWS = [556, 566, 580, 600, 628, 666, 716, 782, 900]
/** 消失点から広がる畦 */
const VP = { x: 500, y: 500 }
const FANS = [-1100, -400, 120, 360, 720, 1050, 1700]
const fanX = (bx: number, y: number) => VP.x + ((bx - VP.x) * (y - VP.y)) / (900 - VP.y)

/** 遠くの山・近くの山の形 */
const FAR = 'M0 540 L0 460 Q90 410 180 440 Q260 392 340 430 Q420 360 520 422 Q600 382 680 430 Q770 392 860 435 Q930 410 1000 450 L1000 540 Z'
const NEAR = 'M0 570 L0 494 Q120 456 230 494 Q330 466 420 512 Q520 486 610 516 Q720 478 830 510 Q920 492 1000 506 L1000 570 Z'

/** 電話ボックスと街灯の位置 */
const BOOTH = { x: 526, y: 534, w: 68, h: 122 }
const BASE = BOOTH.y + BOOTH.h
const POLE = { x: 624, top: 470 }
const LAMP = { x: 590, y: 498 }

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
  const B = BOOTH

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
      </svg>

      {/* 地面：山・田んぼ・電話ボックス・街灯 */}
      <svg className="tl-ground" viewBox="0 380 1000 520" preserveAspectRatio="xMidYMin slice">
        <defs>
          <radialGradient id="tl-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe7a6" stopOpacity="0.85" />
            <stop offset="0.45" stopColor="#ffd98a" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="tl-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1c2" stopOpacity="0.6" />
            <stop offset="1" stopColor="#ffe3a0" stopOpacity="0.1" />
          </linearGradient>
          <clipPath id="tl-fields">
            <rect x="0" y={ROWS[0]} width="1000" height={900 - ROWS[0]} />
          </clipPath>
        </defs>

        {/* 夕日（山に沈みかけている） */}
        {clear && tod === 'evening' && (
          <g>
            <circle cx="400" cy="470" r="150" fill="#ffc98a" opacity="0.35" />
            <circle cx="400" cy="470" r="34" fill="#ffb066" />
          </g>
        )}

        {/* 遠くの山・近くの山 */}
        <path d={FAR} fill={g.far} />
        <path d={NEAR} fill={g.near} />
        {!snowy && (
          <g fill={season === 'autumn' ? '#c45f3a' : season === 'winter' ? '#6a6556' : season === 'spring' ? '#e7b9c4' : '#3f7344'} opacity={season === 'spring' ? 0.85 : 0.55}>
            {[250, 300, 350, 400, 660, 720, 780, 840].map((x, i) => (
              <circle key={x} cx={x} cy={508 + (i % 3) * 6} r={season === 'spring' ? 9 : 12} />
            ))}
          </g>
        )}

        {/* 山に、時間帯・天気の色をかける */}
        <path d={FAR} fill={shade} />
        <path d={NEAR} fill={shade} />

        {/* 田んぼ */}
        <rect x="0" y={ROWS[0] - 6} width="1000" height={900 - ROWS[0] + 6} fill={g.field} />
        <g clipPath="url(#tl-fields)">
          {ROWS.slice(0, -1).map((y, i) => (
            <rect key={y} x="0" y={y} width="1000" height={ROWS[i + 1] - y} fill={i % 2 ? g.dark : g.field} opacity="0.5" />
          ))}
          {!snowy && season === 'spring' && (
            // 水を張った田んぼに空が映り、苗が並ぶ
            <g>
              <rect x="0" y={ROWS[0]} width="1000" height="360" fill={s1} opacity="0.4" />
              {ROWS.slice(1, -1).flatMap((y, i) =>
                Array.from({ length: 14 + i * 3 }, (_, k) => {
                  const x = ((k + 0.5) / (14 + i * 3)) * 1000
                  const yy = y + (ROWS[i + 2] - y) * 0.55
                  const h = 2.5 + i * 1.8
                  return <path key={`${y}-${k}`} d={`M${x} ${yy}l-${h / 3} -${h}M${x} ${yy}l${h / 3} -${h}M${x} ${yy}v-${h * 1.1}`} stroke="#5f9442" strokeWidth={0.9 + i * 0.35} />
                }),
              )}
            </g>
          )}
          {!snowy && season === 'summer' && (
            // 青々と伸びた稲
            <g stroke="#3b7330" opacity="0.6" strokeLinecap="round">
              {ROWS.slice(0, -1).flatMap((y, i) =>
                Array.from({ length: 12 + i * 4 }, (_, k) => {
                  const x = ((k + 0.5) / (12 + i * 4)) * 1000
                  const y2 = ROWS[i + 1]
                  return <path key={`${y}-${k}`} d={`M${x} ${y2 - 2}q${k % 2 ? 3 : -3} -${(y2 - y) * 0.5} ${k % 2 ? 5 : -5} -${y2 - y - 4}`} fill="none" strokeWidth={0.7 + i * 0.6} />
                }),
              )}
            </g>
          )}
          {!snowy && season === 'autumn' && (
            // 実って、こうべを垂れる稲穂
            <g fill="none" stroke="#a87a22" strokeLinecap="round">
              {ROWS.slice(2, -1).flatMap((y, i) =>
                Array.from({ length: 16 + i * 4 }, (_, k) => {
                  const x = ((k + 0.5) / (16 + i * 4)) * 1000
                  const s = 3 + i * 2.6
                  return <path key={`${y}-${k}`} d={`M${x} ${y + s * 1.7}q${s * 0.2} -${s} ${s} -${s * 0.6}`} strokeWidth={0.9 + i * 0.55} />
                }),
              )}
            </g>
          )}
          {!snowy && season === 'winter' && (
            // 刈り取ったあとの切り株だけ
            <g stroke="#7a6446" opacity="0.7">
              {ROWS.slice(2, -1).flatMap((y, i) =>
                Array.from({ length: 12 + i * 3 }, (_, k) => {
                  const x = ((k + 0.5) / (12 + i * 3)) * 1000 + (i % 2) * 18
                  const yy = y + (ROWS[i + 3] - y) * 0.5
                  return <line key={`${y}-${k}`} x1={x} y1={yy} x2={x} y2={yy - (1.5 + i)} strokeWidth={1 + i * 0.4} />
                }),
              )}
            </g>
          )}
          {/* 畦（あぜ） */}
          <g stroke={g.ridge} strokeLinecap="round">
            {ROWS.slice(1, -1).map((y, i) => (
              <line key={y} x1="0" y1={y} x2="1000" y2={y} strokeWidth={1.2 + i * 1.2} />
            ))}
            {FANS.map((bx) => (
              <line key={bx} x1={fanX(bx, ROWS[0])} y1={ROWS[0]} x2={bx} y2="900" strokeWidth="6" />
            ))}
          </g>
        </g>

        {/* 電話へ続く、細い農道 */}
        <path d={`M420 900 L${B.x + 18} ${BASE} L${B.x + B.w - 14} ${BASE} L620 900 Z`} fill={snowy ? '#e4eaee' : '#c8b28a'} />
        {snowy && <path d={`M488 900 L${B.x + 30} ${BASE} M552 900 L${B.x + 44} ${BASE}`} stroke="#cfd8df" strokeWidth="3" fill="none" />}

        {/* 遠くの電柱と電線 */}
        <g stroke="#3d3a3a" strokeWidth="2">
          <line x1="452" y1="530" x2="452" y2="572" />
          <line x1="444" y1="536" x2="460" y2="536" />
          <line x1="398" y1="540" x2="398" y2="566" strokeWidth="1.5" />
          <line x1="392" y1="544" x2="404" y2="544" strokeWidth="1.5" />
        </g>
        <path d={`M100 566 Q250 574 398 544 Q425 552 452 536 Q540 556 ${POLE.x + 3} ${POLE.top + 10} M${POLE.x + 3} ${POLE.top + 10} Q820 560 1000 540`} stroke="#3d3a3a" strokeWidth="1.3" fill="none" opacity="0.7" />

        {/* 田んぼに、時間帯・天気の色をかける（山は上でかけている。空にはかけない） */}
        <rect x="0" y={ROWS[0] - 6} width="1000" height={900 - ROWS[0] + 6} fill={shade} />

        {/* 街灯の光 */}
        {lamp && (
          <g className="tl-lamp-light">
            <path d={`M${LAMP.x - 4} ${LAMP.y} L${LAMP.x - 90} ${BASE} L${LAMP.x + 70} ${BASE} Z`} fill="url(#tl-cone)" />
            <ellipse cx={LAMP.x - 10} cy={BASE} rx="120" ry="26" fill="url(#tl-glow)" />
            <circle cx={LAMP.x} cy={LAMP.y} r="46" fill="url(#tl-glow)" />
          </g>
        )}

        {/* 電話ボックス */}
        <g>
          <ellipse cx={B.x + B.w / 2} cy={BASE} rx={B.w * 0.62} ry="7" fill="#000" opacity="0.2" />
          <rect x={B.x} y={B.y + 10} width={B.w} height={B.h - 10} rx="4" fill={frame} />
          <rect x={B.x + 6} y={B.y + 24} width={B.w - 12} height={B.h - 30} rx="3" fill={lamp ? '#fae9b8' : '#d6e6e6'} opacity={lamp ? 0.96 : 0.88} />
          <path d={`M${B.x + B.w / 2} ${B.y + 24}v${B.h - 30}M${B.x + 6} ${B.y + 70}h${B.w - 12}`} stroke={frame} strokeWidth="3" />
          <rect x={B.x - 5} y={B.y} width={B.w + 10} height="14" rx="4" fill={roof} />
          <rect x={B.x + 18} y={B.y + 3} width={B.w - 36} height="8" rx="2" fill={lamp ? '#fff4cf' : '#eef2ec'} />
          {/* 中の電話 */}
          <rect x={B.x + 13} y={B.y + 40} width="20" height="26" rx="3" fill="#4f8a69" />
          <rect x={B.x + 15} y={B.y + 35} width="16" height="6" rx="3" fill="#3c6b51" />
          <rect x={B.x + 17} y={B.y + 47} width="12" height="4" rx="1" fill="#dfeee5" opacity="0.8" />
          {snowy && <path d={`M${B.x - 5} ${B.y + 1} Q${B.x + B.w / 2} ${B.y - 14} ${B.x + B.w + 5} ${B.y + 1} Z`} fill="#f6f8fa" />}
        </g>

        {/* 街灯（木の電柱に、腕木と傘つきの電灯） */}
        <g>
          <rect x={POLE.x} y={POLE.top} width="9" height={BASE - POLE.top + 2} fill="#6b5546" />
          <line x1={POLE.x + 2} y1={POLE.top + 18} x2={LAMP.x} y2={LAMP.y - 8} stroke="#4b4141" strokeWidth="4" />
          <path d={`M${LAMP.x - 16} ${LAMP.y - 8}h32l-7 10h-18z`} fill="#4b4141" />
          <ellipse cx={LAMP.x} cy={LAMP.y + 2} rx="8" ry="4" fill={lamp ? '#fff3c4' : '#c9c6bd'} />
          {snowy && <rect x={POLE.x - 1} y={POLE.top - 3} width="11" height="5" rx="2" fill="#f6f8fa" />}
        </g>
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
            <g className="tl-rain" stroke={night ? '#9fb0c8' : '#eef2f6'} strokeWidth="1.4" opacity="0.6">
              {LOOP.map(([x, y], i) => (
                <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 26} />
              ))}
            </g>
          )}
        </svg>
      )}
    </div>
  )
}
