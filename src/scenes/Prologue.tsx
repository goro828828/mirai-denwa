/**
 * 初回だけの導入（2回目以降は出さない）
 *
 * いつもの帰り道でカードを拾う（カフェのそばの音）
 * → 気がつくと、知らない畦道に立っている（ここから、天気に合わせた環境音）
 * → スマホは圏外。少し先に、街灯に照らされた公衆電話
 * → カードに名前を書き、電話をかける（ここからは、いつもの流れ）
 * → カードを受け取ると、元の帰り道に戻っている
 */
import { useEffect, useState } from 'react'
import { TitleLandscape, type Season } from '../components/TitleLandscape'
import type { TimeOfDay } from '../lib/weather'
import type { WeatherKind } from '../types'
import { sound } from '../lib/sound'

/** 一行ずつ、間をおいて出す */
function useLines(count: number, reduced: boolean, key: string) {
  const [shown, setShown] = useState(reduced ? count : 0)
  useEffect(() => {
    setShown(reduced ? count : 0)
  }, [key, count, reduced])
  useEffect(() => {
    if (shown >= count) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 900 : 1500)
    return () => window.clearTimeout(t)
  }, [shown, count])
  return shown
}

const LOST: Record<'arrive' | 'phone' | 'booth', string[]> = {
  arrive: ['……あれ？', '気がつくと、知らない畦道に立っていた。'],
  phone: ['……圏外。', 'どこにも、つながらない。'],
  booth: ['少し先で、街灯がひとつ、公衆電話を照らしている。', '手の中には、さっき拾ったテレフォンカード。'],
}
const NEXT: Record<keyof typeof LOST, string> = {
  arrive: 'スマホを取り出す',
  phone: 'まわりを見る',
  booth: '公衆電話へ向かう',
}

export function LostScene({
  landscape,
  reduced,
  onDone,
}: {
  landscape: { tod: TimeOfDay; weather: WeatherKind | null; season: Season }
  reduced: boolean
  onDone: () => void
}) {
  const [stage, setStage] = useState<keyof typeof LOST>('arrive')
  const lines = LOST[stage]
  const shown = useLines(lines.length, reduced, stage)
  const ready = shown >= lines.length

  const next = () => {
    sound.click()
    if (stage === 'arrive') setStage('phone')
    else if (stage === 'phone') setStage('booth')
    else onDone()
  }

  return (
    <section className={`scene lost-scene${reduced ? '' : ' warp-in'}`}>
      <TitleLandscape {...landscape} />
      {stage === 'phone' && <NoSignalPhone />}
      <div className="prologue-panel">
        <div className="prologue-lines" aria-live="polite">
          {lines.slice(0, shown).map((l) => (
            <p key={l} className="fade-in">
              {l}
            </p>
          ))}
        </div>
        <button type="button" className={`btn primary${ready ? ' fade-in' : ''}`} onClick={next} disabled={!ready} style={{ visibility: ready ? 'visible' : 'hidden' }}>
          {NEXT[stage]}
        </button>
      </div>
    </section>
  )
}

/** 圏外のスマホ（特定の機種を模したものではない） */
function NoSignalPhone() {
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  return (
    <div className="nosignal-phone fade-in" role="img" aria-label="スマホの画面。圏外と表示されている">
      <div className="nsp-status">
        <span>{time}</span>
        <span className="nsp-out">圏外</span>
      </div>
      <div className="nsp-body">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M8 36h5v6H8zM17 30h5v12h-5zM26 24h5v18h-5zM35 18h5v24h-5z" fill="currentColor" opacity="0.25" />
          <path d="M6 6l36 36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p>圏外</p>
        <small>ネットワークに接続できません</small>
      </div>
    </div>
  )
}

const BACK_LINES = ['……気がつくと、いつもの帰り道に立っていた。', '手の中には、あのテレフォンカード。']

export function ReturnScene({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const shown = useLines(BACK_LINES.length, reduced, 'back')
  const ready = shown >= BACK_LINES.length
  return (
    <section className={`scene return-scene${reduced ? '' : ' warp-in'}`}>
      <div className="narration" aria-live="polite">
        {BACK_LINES.slice(0, shown).map((l) => (
          <p key={l} className="fade-in">
            {l}
          </p>
        ))}
      </div>
      <div className="stack bottom">
        {ready && (
          <button
            type="button"
            className="btn primary fade-in"
            onClick={() => {
              sound.click()
              onDone()
            }}
          >
            カードを見る
          </button>
        )}
      </div>
    </section>
  )
}
