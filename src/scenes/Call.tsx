import { useCallback, useEffect, useRef, useState } from 'react'
import { NODES, RECALL_CHANCE, recallFor, type Choice, type StoryNode, type Variant } from '../story/script'
import { cleanInput, resolveText, speak, type CallContext } from '../story/engine'
import type { AnswerLog, Profile, WeatherInfo } from '../types'
import { dialectOf } from '../data/prefectures'
import { sound } from '../lib/sound'
import { formatDuration } from '../lib/format'
import { TOTAL_UNITS } from '../lib/cardImage'

interface Entry {
  id: number
  who: 'future' | 'me' | 'system'
  text: string
  final?: boolean
  voiced?: boolean
}

type Pending =
  | { kind: 'choices'; node: StoryNode; choices: Choice[] }
  | { kind: 'input'; node: StoryNode }
  | null

export interface CallResult {
  answers: AnswerLog[]
  finalMessage: string
  usedUnits: number
}

export function CallScene({
  profile,
  weather,
  reduced,
  onEnd,
}: {
  profile: Profile
  weather: WeatherInfo | null
  reduced: boolean
  onEnd: (r: CallResult) => void
}) {
  const [log, setLog] = useState<Entry[]>([])
  const [typing, setTyping] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [units, setUnits] = useState(TOTAL_UNITS)
  const [elapsed, setElapsed] = useState(0)
  const [ended, setEnded] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const ctx = useRef<CallContext>({
    name: profile.nickname,
    dialect: dialectOf(profile.prefCode),
    lifestage: profile.lifestage,
    weather,
    hour: new Date().getHours(),
    answers: {},
  })
  const answerLog = useRef<AnswerLog[]>([])
  const finalText = useRef('')
  const unitsRef = useRef(TOTAL_UNITS)
  const recallCount = useRef(0)
  const idRef = useRef(0)
  const skipRef = useRef<(() => void) | null>(null)
  const alive = useRef(true)
  const started = useRef(false)
  const logEnd = useRef<HTMLDivElement>(null)
  const firstChoice = useRef<HTMLButtonElement>(null)

  const push = (e: Omit<Entry, 'id'>) => setLog((l) => [...l, { ...e, id: ++idRef.current }])

  /** 待ち時間（画面タップで早送りできる） */
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = window.setTimeout(done, ms)
      function done() {
        window.clearTimeout(t)
        skipRef.current = null
        resolve()
      }
      skipRef.current = done
    })

  const say = async (lines: Variant[], opts: { finalFirst?: boolean; voiced?: boolean } = {}) => {
    for (let i = 0; i < lines.length; i++) {
      if (!alive.current) return
      const text = speak(lines[i], ctx.current)
      setTyping(true)
      await wait(Math.min(700 + text.length * 45, 2800))
      if (!alive.current) return
      setTyping(false)
      const final = opts.finalFirst && i === 0
      if (final) finalText.current = text
      push({ who: 'future', text, final, voiced: opts.voiced && i === 0 })
      await wait(final ? 1600 : 350)
    }
  }

  /**
   * 「確かにそうだった気がする」をランダムに差しこむ。
   * 一度も出ないまま「今日の気持ち」まで来たら、そこで必ず一度出す。
   */
  const maybeRecall = async (key: string, value: string) => {
    const forced = key === 'mood' && recallCount.current === 0
    if (!forced && Math.random() >= RECALL_CHANCE) return
    const line = recallFor(key, value, ctx.current)
    if (!line) return
    recallCount.current++
    await wait(500)
    await say([line])
  }

  const spend = (n: number) => {
    unitsRef.current = Math.max(1, unitsRef.current - n)
    setUnits(unitsRef.current)
  }

  const finish = useCallback(async () => {
    setPending(null)
    sound.busy()
    sound.duck(false)
    push({ who: 'system', text: '― 通話が終わりました ―' })
    setEnded(true)
    await new Promise((r) => window.setTimeout(r, 2200))
    if (!alive.current) return
    onEnd({ answers: answerLog.current, finalMessage: finalText.current, usedUnits: TOTAL_UNITS - unitsRef.current })
  }, [onEnd])

  const runNode = async (id: string | undefined) => {
    if (!alive.current) return
    const node = id ? NODES[id] : undefined
    if (!node) return finish()

    let voiced = false
    if (node.effect === 'voice') voiced = await sound.playVoice(profile.gender)
    if (node.effect === 'listen') sound.duck(false)
    if (node.effect === 'lowcard') {
      sound.pip()
      unitsRef.current = 3
      setUnits(3)
      push({ who: 'system', text: '残り度数が少なくなっています' })
      await wait(900)
    }
    if (node.say) await say(node.say(ctx.current), { finalFirst: node.effect === 'final', voiced })
    if (!alive.current) return

    if (node.choices) setPending({ kind: 'choices', node, choices: node.choices(ctx.current) })
    else if (node.input) {
      setInputValue('')
      setPending({ kind: 'input', node })
    } else await runNode(node.next)
  }

  const choose = async (node: StoryNode, c: Choice) => {
    setPending(null)
    sound.click()
    const label = resolveText(c.label, ctx.current)
    // まわりの音を聞く場面が終わったら、通話の音量にゆっくり戻す
    if (node.effect === 'listen') sound.duck(true)
    push({ who: 'me', text: label })
    if (node.answerKey) ctx.current.answers[node.answerKey] = c.value
    if (node.question) answerLog.current.push({ key: node.answerKey ?? node.id, question: node.question, answer: label })
    spend(4)
    await wait(400)
    if (c.reply) await say(c.reply)
    if (!c.next) await maybeRecall(node.id, c.value)
    await runNode(c.next ?? node.next)
  }

  const submitInput = async (node: StoryNode, skip: boolean) => {
    if (!node.input) return
    setPending(null)
    sound.click()
    const value = skip ? '' : cleanInput(inputValue, node.input.maxLength)
    ctx.current.answers[node.input.key] = value
    push({ who: 'me', text: value || '……ひみつ。' })
    answerLog.current.push({ key: node.input.key, question: node.question ?? node.input.prompt, answer: value || '（書かなかった）' })
    spend(4)
    await wait(400)
    if (node.inputReply) await say(node.inputReply(value))
    if (value) await maybeRecall(node.input.key, 'input')
    await runNode(node.next)
  }

  useEffect(() => {
    alive.current = true
    if (!started.current) {
      started.current = true
      sound.duck(true)
      void runNode('open')
    }
    return () => {
      alive.current = false
      skipRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ended) return
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [ended])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' })
  }, [log, typing, pending, reduced])

  useEffect(() => {
    if (pending?.kind === 'choices') firstChoice.current?.focus({ preventScroll: true })
  }, [pending])

  const unitPct = (units / TOTAL_UNITS) * 100

  return (
    <section className="scene call-scene">
      <header className="call-head">
        <div>
          <p className="call-status">
            <span className={`dot${ended ? ' off' : ''}`} aria-hidden="true" />
            {ended ? '通話終了' : '通話中'}　<span className="mono">{formatDuration(elapsed)}</span>
          </p>
          <p className="call-name">10年後の {profile.nickname}</p>
        </div>
        <div className="units" aria-label={`カードの残り ${units} 度`}>
          <span className="units-label">残り</span>
          <span className="units-num">{units}</span>
          <span className="units-bar">
            <span style={{ width: `${unitPct}%` }} className={units <= 5 ? 'low' : ''} />
          </span>
        </div>
      </header>

      <div
        className="call-log"
        role="log"
        aria-live="polite"
        aria-label="通話の字幕"
        onClick={() => skipRef.current?.()}
      >
        {log.map((e) => (
          <div key={e.id} className={`bubble ${e.who}${e.final ? ' final' : ''}`}>
            {e.who === 'future' && e.voiced && (
              <span className="voiced" aria-label="音声あり">
                ♪
              </span>
            )}
            {e.final && <span className="final-label">10年後の {profile.nickname} から、最後に</span>}
            <p>{e.text}</p>
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
        {pending?.kind === 'choices' && (
          <div className="choices" role="group" aria-label="返事を選ぶ">
            {pending.choices.map((c, i) => (
              <button
                type="button"
                key={c.value}
                ref={i === 0 ? firstChoice : undefined}
                className="btn choice"
                onClick={() => void choose(pending.node, c)}
              >
                {resolveText(c.label, ctx.current)}
              </button>
            ))}
          </div>
        )}
        {pending?.kind === 'input' && pending.node.input && (
          <form
            className="free-input"
            onSubmit={(e) => {
              e.preventDefault()
              void submitInput(pending.node, false)
            }}
          >
            <label htmlFor="free" className="free-label">
              {pending.node.input.prompt}
            </label>
            <div className="free-row">
              <input
                id="free"
                className="text-input"
                type="text"
                autoFocus
                maxLength={pending.node.input.maxLength}
                placeholder={pending.node.input.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" className="btn primary small" disabled={!inputValue.trim()}>
                伝える
              </button>
            </div>
            <button type="button" className="btn ghost small" onClick={() => void submitInput(pending.node, true)}>
              書かずに答える
            </button>
          </form>
        )}
        {!pending && !ended && <p className="tap-hint">画面をタップすると、少し早く進みます</p>}
      </div>
    </section>
  )
}
