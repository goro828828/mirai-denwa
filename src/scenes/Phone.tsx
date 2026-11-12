import { useEffect, useRef, useState } from 'react'
import { Payphone, type SlotState } from '../components/Payphone'
import { CardForm, CardPrinted } from '../components/PhoneCard'
import type { CallRecord, Profile, WeatherInfo, WeatherKind } from '../types'
import { findPref } from '../data/prefectures'
import { sound } from '../lib/sound'
import { TOTAL_UNITS } from '../lib/cardImage'
import { DEFAULT_AGE, resolveDial } from '../story/engine'

type Stage = 'idle' | 'lifted' | 'inserting' | 'input' | 'dialing' | 'ringing' | 'pastcall'

/** 過去の自分は、すぐに電話を切ってしまう（年齢で言い方が変わる） */
function pastLines(pastAge: number): string[] {
  if (pastAge <= 12) return ['もしもし？ ……だれ？', '……知らない人と話しちゃだめって、言われてるから！']
  if (pastAge <= 19) return ['……もしもし？ どちらさまですか？', '……え、未来？ いたずらなら、切りますね。']
  if (pastAge <= 29) return ['はい、もしもし……？', '……すみません、今ちょっと手がはなせなくて。']
  return ['はい、もしもし。', '……ごめんなさい、今立てこんでいて。また、あとで。']
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

export function PhoneScene({
  profile,
  weather,
  years,
  onConnected,
  onManualWeather,
  dialMode = false,
}: {
  /** 自分から年代を選んでかける回 */
  dialMode?: boolean
  profile: Profile
  /** 何年後の自分にかけるか */
  years: number
  /** undefined = 取得中、null = 取得できなかった */
  weather: WeatherInfo | null | undefined
  /** つながった（自分で選んだときは、その相手） */
  onConnected: (to?: { years: number; relation?: string }) => void
  /** 天気を取得できなかったときに、プレイヤーが自分で空を選ぶ（任意） */
  onManualWeather: (kind: WeatherKind) => void
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [lcd, setLcd] = useState('受話器をあげてください')
  const [key, setKey] = useState<number | null>(null)
  const [drag, setDrag] = useState(0)
  const dialStop = useRef<() => void>(() => {})
  const dragStart = useRef<number | null>(null)
  const alive = useRef(true)
  const pref = findPref(profile.prefCode)
  const age = profile.age ?? DEFAULT_AGE
  const today = new Date()
  const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const [typed, setTyped] = useState('')
  const [note, setNote] = useState('')
  const [past, setPast] = useState<{ who: string; lines: string[] } | null>(null)

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
    if (dialMode) {
      setStage('input')
      setTyped('')
      setLcd(`____.${mmdd.slice(0, 2)}.${mmdd.slice(2)}`)
      return
    }
    setStage('dialing')
    // ◯年後の今日へダイヤル
    const d = new Date()
    const target = `${d.getFullYear() + years}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
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

  // ---- 自分で年を押してかける ----
  const showTyped = (v: string) => setLcd(`${v.padEnd(4, '_')}.${mmdd.slice(0, 2)}.${mmdd.slice(2)}`)
  const press = (n: number) => {
    if (stage !== 'input' || typed.length >= 4) return
    const v = typed + n
    setKey(n)
    sound.key(n)
    window.setTimeout(() => setKey(null), 150)
    setTyped(v)
    setNote('')
    showTyped(v)
  }
  const erase = () => {
    if (stage !== 'input') return
    sound.click()
    const v = typed.slice(0, -1)
    setTyped(v)
    showTyped(v)
  }
  /** うまくかけられなかったとき：表示を戻して、もう一度押してもらう */
  const retry = async (lcdText: string, message: string) => {
    setLcd(lcdText)
    setNote(message)
    await sleep(1800)
    if (!alive.current) return
    setTyped('')
    showTyped('')
    setStage('input')
  }
  const call = async () => {
    if (stage !== 'input') return
    if (typed.length < 4) return setNote('年を4けたで押してください。')
    const r = resolveDial(Number(typed), age, today.getFullYear())
    setStage('dialing')
    setNote('')
    // 月日（今日と同じ）が、ひとりでに押される
    for (let i = 0; i < mmdd.length; i++) {
      if (!alive.current) return
      const n = Number(mmdd[i])
      setKey(n)
      sound.key(n)
      await sleep(170)
      setKey(null)
      await sleep(90)
    }
    dialStop.current()
    await sleep(500)
    if (!alive.current) return
    const label = `${typed}.${mmdd.slice(0, 2)}.${mmdd.slice(2)}`
    // つながる相手がいない年：いったんかけてみて、つながらないことがわかる
    if (r.kind === 'now' || r.kind === 'tooFar' || r.kind === 'unreachable') {
      setStage('ringing')
      setLcd(`${label} 呼び出し中`)
      await sleep(1600)
      if (!alive.current) return
      setLcd(`${label} ……`)
      sound.busy()
      await sleep(2600)
      if (!alive.current) return
      dialStop.current = sound.dialTone()
      const why = {
        now: '……この番号には、かからないようだ。近すぎたのかもしれない。',
        tooFar: '……この番号には、かからないようだ。そんなに昔には、届かないのかもしれない。',
        unreachable: '……この番号には、かからないようだ。遠すぎたのかもしれない。',
      }[r.kind]
      return retry('もう一度 年を押してください', `${why}別の年を押してみよう。`)
    }
    setStage('ringing')
    setLcd(`${label} 呼び出し中`)
    sound.ring(r.kind === 'past' ? 1 : 2)
    await sleep(r.kind === 'past' ? 2600 : 5600)
    if (!alive.current) return
    if (r.kind === 'past') {
      // 過去の自分は、すぐに切ってしまう
      setStage('pastcall')
      const lines = pastLines(r.pastAge)
      setPast({ who: `${r.back}年前の自分（${r.pastAge}歳）`, lines: [] })
      for (const l of lines) {
        await sleep(1300)
        if (!alive.current) return
        setPast((p) => p && { ...p, lines: [...p.lines, l] })
      }
      await sleep(1400)
      if (!alive.current) return
      sound.busy()
      setPast((p) => p && { ...p, lines: [...p.lines, '（ガチャッ……ツー、ツー）'] })
      await sleep(2200)
      if (!alive.current) return
      setPast(null)
      dialStop.current = sound.dialTone()
      return retry('もう一度 年を押してください', '……切られてしまった。もう一度、別の年にかけてみよう。')
    }
    onConnected({ years: r.years, relation: r.kind === 'kin' ? r.relation : undefined })
  }

  const slot: SlotState = stage === 'idle' || stage === 'lifted' ? 'empty' : stage === 'inserting' ? 'inserting' : 'inside'

  let guide = '受話器をタップして、あげてください。'
  if (stage === 'lifted') guide = 'カードを上にスワイプするか、タップして差し込んでください。'
  if (stage === 'inserting') guide = 'カードが吸いこまれていく。'
  if (stage === 'input') guide = '今日は、番号がひとりでに押されない。……かけたい年を、自分で押してみよう。'
  if (stage === 'pastcall') guide = '……誰かが出た。'
  if (stage === 'dialing') guide = dialMode ? '月と日が、ひとりでに押されていく。' : years < 0 || years >= 100 ? '……いつもと、ちがう番号が押されていく。' : '番号が、ひとりでに押されていく。'
  if (stage === 'ringing') guide = '……呼び出し音が鳴っている。'

  return (
    <section className="scene phone-scene">
      <p className="weather-note">
        {weather === undefined && `${pref?.name ?? ''}の天気を確認しています…`}
        {weather === null && '天気を取得できませんでした。よかったら、いまの空を教えてください。'}
        {weather && !weather.manual && weather.source !== 'here' &&
          (weather.source === 'jma'
            ? `${pref?.name}${weather.station === pref?.name ? '' : `（${weather.station}）`}の今日の天気：${weather.label}（気象庁の予報）`
            : `${pref?.name}（代表地点：${weather.station}）は いま${weather.label}`)}
        {weather?.manual && `いまの空：${weather.label}`}
        {weather?.source === 'here' && `現在地の天気：${weather.label}`}
      </p>
      {weather === null && (
        <div className="sky-pick" role="group" aria-label="いまの空を選ぶ（任意）">
          {(
            [
              ['clear', '晴れ'],
              ['cloudy', 'くもり'],
              ['rain', '雨'],
              ['thunder', '雷'],
            ] as const
          ).map(([k, label]) => (
            <button type="button" key={k} className="chip small" onClick={() => onManualWeather(k)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <Payphone
        lifted={stage !== 'idle'}
        lcd={lcd}
        slot={slot}
        activeKey={key}
        onKey={stage === 'input' ? press : undefined}
        onHandset={stage === 'idle' ? lift : undefined}
        handsetLabel="受話器をあげる"
      />

      <p className="guide" aria-live="polite">
        {guide}
      </p>
      {note && (
        <p className="dial-note" role="status">
          {note}
        </p>
      )}

      {past && (
        <div className="past-call" aria-live="polite">
          <p className="past-who">{past.who}</p>
          {past.lines.map((l) => (
            <p key={l} className="bubble future fade-in">
              {l}
            </p>
          ))}
        </div>
      )}

      {stage === 'input' && (
        <div className="dial-pad" role="group" aria-label="かけたい年を押す">
          <p className="dial-help">電話の押しボタンで、かけたい年（4けた）を押してください。日付は今日と同じです。</p>
          <div className="dial-actions">
            <button type="button" className="btn ghost" onClick={erase} disabled={!typed}>
              1けた消す
            </button>
            <button type="button" className="btn primary" onClick={() => void call()} disabled={typed.length < 4}>
              かける
            </button>
          </div>
        </div>
      )}

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
