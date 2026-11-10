import { useEffect, useRef, useState } from 'react'
import { Payphone, type SlotState } from '../components/Payphone'
import { CardForm, CardPrinted } from '../components/PhoneCard'
import type { CallRecord, Profile, WeatherInfo } from '../types'
import { findPref } from '../data/prefectures'
import { sound } from '../lib/sound'
import { TOTAL_UNITS } from '../lib/cardImage'

type Stage = 'idle' | 'lifted' | 'inserting' | 'dialing' | 'ringing'

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

export function PhoneScene({
  profile,
  weather,
  onConnected,
}: {
  profile: Profile
  /** undefined = 取得中、null = 取得できなかった */
  weather: WeatherInfo | null | undefined
  onConnected: () => void
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [lcd, setLcd] = useState('受話器をあげてください')
  const [key, setKey] = useState<number | null>(null)
  const [drag, setDrag] = useState(0)
  const dialStop = useRef<() => void>(() => {})
  const dragStart = useRef<number | null>(null)
  const alive = useRef(true)
  const pref = findPref(profile.prefCode)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      dialStop.current()
    }
  }, [])

  const lift = () => {
    if (stage !== 'idle') return
    sound.click()
    dialStop.current = sound.dialTone()
    setStage('lifted')
    setLcd('カードを入れてください')
  }

  const insert = async () => {
    if (stage !== 'lifted') return
    setStage('inserting')
    setDrag(0)
    sound.cardIn()
    await sleep(900)
    if (!alive.current) return
    setLcd(`残り ${TOTAL_UNITS} 度`)
    await sleep(700)
    if (!alive.current) return
    setStage('dialing')
    // 10年後の今日へダイヤル
    const d = new Date()
    const target = `${d.getFullYear() + 10}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    setLcd('')
    for (let i = 0; i < target.length; i++) {
      if (!alive.current) return
      const n = Number(target[i])
      setKey(n)
      sound.key(n)
      setLcd(target.slice(0, i + 1))
      await sleep(170)
      setKey(null)
      await sleep(90)
    }
    dialStop.current()
    await sleep(500)
    if (!alive.current) return
    setStage('ringing')
    setLcd(`${target.slice(0, 4)}.${target.slice(4, 6)}.${target.slice(6)} 呼び出し中`)
    sound.ring(2)
    await sleep(5600)
    if (!alive.current) return
    onConnected()
  }

  const slot: SlotState = stage === 'idle' || stage === 'lifted' ? 'empty' : 'inside'

  let guide = '受話器をタップして、あげてください。'
  if (stage === 'lifted') guide = 'カードを上にスワイプするか、タップして差し込んでください。'
  if (stage === 'inserting') guide = 'カードが吸いこまれていく。'
  if (stage === 'dialing') guide = '番号が、ひとりでに押されていく。'
  if (stage === 'ringing') guide = '……呼び出し音が鳴っている。'

  return (
    <section className="scene phone-scene">
      <p className="weather-note">
        {weather === undefined && `${pref?.name ?? ''}の天気を確認しています…`}
        {weather === null && '天気を取得できなかったため、環境音なしで進みます。'}
        {weather && `${pref?.name}（代表地点：${weather.station}）は いま${weather.label}`}
      </p>

      <Payphone
        lifted={stage !== 'idle'}
        lcd={lcd}
        slot={slot}
        activeKey={key}
        onHandset={stage === 'idle' ? lift : undefined}
        handsetLabel="受話器をあげる"
      />

      <p className="guide" aria-live="polite">
        {guide}
      </p>

      <div className="insert-zone">
        {(stage === 'lifted' || stage === 'inserting') && (
          <button
            type="button"
            className={`insert-card${stage === 'inserting' ? ' going' : ''}`}
            style={drag ? { transform: `translateY(${drag}px)` } : undefined}
            onClick={insert}
            onPointerDown={(e) => {
              dragStart.current = e.clientY
            }}
            onPointerMove={(e) => {
              if (dragStart.current === null) return
              setDrag(Math.min(0, e.clientY - dragStart.current))
            }}
            onPointerUp={(e) => {
              const moved = dragStart.current === null ? 0 : e.clientY - dragStart.current
              dragStart.current = null
              if (moved < -50) void insert()
              else setDrag(0)
            }}
            onPointerCancel={() => {
              dragStart.current = null
              setDrag(0)
            }}
            aria-label="テレフォンカードを差し込む"
          >
            <CardForm values={profile} />
          </button>
        )}
      </div>
    </section>
  )
}

export function EjectScene({ record, reduced, onDone }: { record: CallRecord; reduced: boolean; onDone: () => void }) {
  const [stage, setStage] = useState<'hangup' | 'ejecting' | 'out' | 'reveal' | 'printed'>('hangup')
  const [chars, setChars] = useState(0)
  const msgLen = record.finalMessage.length

  useEffect(() => {
    let t: number
    if (stage === 'hangup') t = window.setTimeout(() => setStage('ejecting'), 1300)
    else if (stage === 'ejecting') {
      sound.eject()
      t = window.setTimeout(() => setStage('out'), 1300)
    } else if (stage === 'reveal') {
      if (reduced) {
        setChars(msgLen)
        setStage('printed')
        return
      }
      t = window.setInterval(() => {
        setChars((c) => {
          if (c + 1 >= msgLen) {
            window.clearInterval(t)
            setStage('printed')
            return msgLen
          }
          return c + 1
        })
      }, 55)
      return () => window.clearInterval(t)
    }
    return () => window.clearTimeout(t)
  }, [stage, reduced, msgLen])

  const lcd = stage === 'hangup' ? 'ご利用ありがとうございました' : 'カードをお取りください'
  const showCard = stage === 'reveal' || stage === 'printed'

  return (
    <section className="scene eject-scene">
      {!showCard ? (
        <>
          <Payphone lifted={false} lcd={lcd} slot={stage === 'hangup' ? 'inside' : stage === 'ejecting' ? 'ejecting' : 'out'} />
          <p className="guide" aria-live="polite">
            {stage === 'out' ? 'カードが戻ってきた。……なにか、文字が増えている。' : ' '}
          </p>
          <div className="stack bottom">
            {stage === 'out' && (
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  sound.click()
                  setStage('reveal')
                }}
              >
                カードを取る
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="narration-single fade-in">拾ったときにはなかった文字が、印字されていた。</p>
          <div className="reveal-card fade-in">
            <CardPrinted record={record} printedChars={stage === 'printed' ? undefined : chars} />
          </div>
          <div className="stack bottom">
            {stage === 'printed' && (
              <button type="button" className="btn primary fade-in" onClick={onDone}>
                このカードを持ち帰る
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
