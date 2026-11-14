/**
 * 名前の欄に書かれた言葉で起きる、特別な通話（story/forbidden.ts）
 *
 * - bureau：1000年後の「時間管理局」につながる。最後に記憶を消され、名前の記入に戻る
 * - inmu：存在しない日付「1145年14月19日」につながる。相手が歌い出し、通話履歴がすべて消える
 */
import { useEffect, useRef, useState } from 'react'
import type { NameEvent } from '../story/forbidden'
import { sound } from '../lib/sound'
import { formatDuration } from '../lib/format'

type Who = 'future' | 'me' | 'system'
type Step = { who: Who; text: string; wait?: number } | { act: 'song' | 'wipe' | 'erase'; wait?: number }

function bureauSteps(): Step[] {
  const y = new Date().getFullYear() + 1000
  return [
    { who: 'system', text: `${y}年（1000年後）に、つながった。`, wait: 1200 },
    { who: 'future', text: '……はい、こちら時間管理局。' },
    { who: 'me', text: 'えっ……時間、管理局？' },
    { who: 'future', text: 'また、時間を越えた通話か……。最近こういうのが、やけに多いんだよなぁ。' },
    { who: 'future', text: '時間航行が発見される時代より前から、かけてきちゃいけない決まりなのに……。' },
    { who: 'me', text: 'あの、なんの話ですか？' },
    { who: 'future', text: 'あ、ごめんごめん。君には関係ない話だった。' },
    { who: 'future', text: '悪いけど、この通話の記憶は消させてもらうよ。' },
    { who: 'future', text: '……それと、カードの名前の欄。次は、[[もう少しやさしい言葉で書くといい]]。', wait: 2200 },
    { act: 'erase', wait: 1800 },
  ]
}

const INMU_STEPS: Step[] = [
  { who: 'system', text: '1145年14月19日……存在しないはずの日付に、つながってしまった。', wait: 1600 },
  { who: 'future', text: '…………。' },
  { who: 'system', text: '受話器の向こうで、だれかが大きく息を吸いこんだ。' },
  { who: 'future', text: '♪ INMU KING ──！' },
  { act: 'song', wait: 400 },
  { who: 'system', text: '（INMU KING を、高らかに歌いはじめた）' },
  { who: 'future', text: '♪〜　♪♪〜〜' },
  { who: 'future', text: '♪♪♪〜〜〜！！' },
  { who: 'system', text: '歌声が大きくなるにつれて、カードに刻まれた文字が、にじんで消えていく……。', wait: 2400 },
  { act: 'wipe', wait: 600 },
  { who: 'system', text: '（ガチャッ……ツー、ツー）' },
  { who: 'system', text: '通話履歴が、すべて消えてしまった。', wait: 800 },
]

/** [[ ]] で囲んだところを、赤い太字で強調する */
function emphasize(text: string) {
  return text.split(/(\[\[.+?\]\])/).map((part, i) =>
    part.startsWith('[[') ? (
      <strong key={i} className="em-red">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

export function AnomalyScene({
  kind,
  reduced,
  onWipe,
  onDone,
}: {
  kind: NameEvent
  reduced: boolean
  /** inmu：通話履歴を消す */
  onWipe: () => void
  /** 終わったとき（bureau は記憶を消されたあと自動で、inmu はボタンで） */
  onDone: () => void
}) {
  const [log, setLog] = useState<{ id: number; who: Who; text: string }[]>([])
  const [typing, setTyping] = useState(false)
  const [ended, setEnded] = useState(false)
  const [flash, setFlash] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const logEnd = useRef<HTMLDivElement>(null)
  const done = useRef(onDone)
  const wipe = useRef(onWipe)
  done.current = onDone
  wipe.current = onWipe

  useEffect(() => {
    let alive = true
    const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, reduced ? Math.min(ms, 400) : ms))
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    void (async () => {
      let id = 0
      const steps = kind === 'bureau' ? bureauSteps() : INMU_STEPS
      await sleep(600)
      for (const s of steps) {
        if (!alive) return
        if ('act' in s) {
          if (s.act === 'song') sound.song()
          if (s.act === 'wipe') {
            wipe.current()
            sound.busy()
          }
          if (s.act === 'erase') {
            sound.erase()
            setFlash(true)
          }
          await sleep(s.wait ?? 800)
          continue
        }
        if (s.who === 'future') {
          setTyping(true)
          await sleep(Math.min(1800, 500 + s.text.length * 45))
          if (!alive) return
          setTyping(false)
        }
        setLog((l) => [...l, { id: ++id, who: s.who, text: s.text }])
        await sleep(s.wait ?? (s.who === 'me' ? 1300 : 1600))
      }
      if (!alive) return
      window.clearInterval(timer)
      setEnded(true)
      if (kind === 'bureau') done.current()
    })()
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [kind, reduced])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' })
  }, [log, typing, reduced])

  const who = kind === 'bureau' ? '1000年後の時間管理局' : '1145年14月19日の？？？'

  return (
    <section className={`scene call-scene anomaly-${kind}`}>
      <header className="call-head">
        <div>
          <p className="call-status">
            <span className={`dot${ended ? ' off' : ''}`} aria-hidden="true" />
            {ended ? '通話終了' : '通話中'}　<span className="mono">{formatDuration(elapsed)}</span>
          </p>
          <p className="call-name">{who}</p>
        </div>
      </header>

      <div className="call-log" role="log" aria-live="polite" aria-label="通話の字幕" tabIndex={0}>
        {log.map((e) => (
          <div key={e.id} className={`bubble ${e.who}`}>
            <p>{emphasize(e.text)}</p>
          </div>
        ))}
        {typing && (
          <div className="bubble future typing" aria-label="話しています">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={logEnd} />
      </div>

      <div className="call-controls">
        {ended && kind === 'inmu' ? (
          <button
            type="button"
            className="btn primary fade-in"
            onClick={() => {
              sound.click()
              done.current()
            }}
          >
            ホームへ戻る
          </button>
        ) : (
          <p className="tap-hint">{kind === 'bureau' ? '……' : '♪'}</p>
        )}
      </div>

      {flash && <div className="erase-flash" aria-hidden="true" />}
    </section>
  )
}
