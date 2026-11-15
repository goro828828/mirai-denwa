import { useCallback, useEffect, useRef, useState } from 'react'
import { NODES, RECALL_CHANCE, recallFor, type Choice, type InputDef, type StoryNode, type Variant } from '../story/script'
import { DEFAULT_AGE, PARENT, callerLabel, cleanInput, resolveText, scriptFor, seasonDayOf, speak, tierFor, type CallContext, type CallEvents, type PrevCall } from '../story/engine'
import { monthDayLabel } from '../story/events'
import { loadBirthday } from '../lib/storage'
import { pickTopic } from '../story/topics'
import type { AnswerLog, Profile, WeatherInfo } from '../types'
import { DIALECTS, dialectFor, parentDialectFor, renderDialect } from '../data/dialects'
import { sound } from '../lib/sound'
import { formatDuration } from '../lib/format'
import { TOTAL_UNITS } from '../lib/cardImage'

/** 度数：1回答えるごとに UNIT_STEP 減り、残りわずかの場面で UNIT_LOW になる */
const UNIT_STEP = 5
const UNIT_FLOOR = 6
const UNIT_LOW = 3
/** 長押し早送り */
const TICK = 30
const FAST_RATE = 6
const HOLD_DELAY = 180

interface Entry {
  id: number
  who: 'future' | 'me' | 'system' | 'stranger'
  text: string
  final?: boolean
  voiced?: boolean
}

type Pending =
  | { kind: 'choices'; node: StoryNode; choices: Choice[] }
  | { kind: 'input'; node: StoryNode; input: InputDef }
  | null

function nextOf(node: StoryNode, c: CallContext): string | undefined {
  return typeof node.next === 'function' ? node.next(c) : node.next
}

/** 通話履歴に残す質問は、共通語で残す（{だった} などの置き換え部分を外す） */
function questionOf(node: StoryNode, c: CallContext): string | undefined {
  const q = typeof node.question === 'function' ? node.question(c) : node.question
  return q === undefined ? undefined : renderDialect(q, DIALECTS['13'])
}

export interface CallResult {
  answers: AnswerLog[]
  finalMessage: string
  usedUnits: number
  /** その回に出た話題（「最近の◯◯」枠） */
  topic: string
  /** 100歳の自分に教えた誕生日（「03-14」） */
  birthday?: string
  /** タイムカプセル：1年後の自分へのひとこと */
  capsule?: string
  /** 選んだ答え（次の電話で、ときどき前の話にふれるため） */
  picks?: Record<string, string>
}

/** 次の電話で使う答えだけを残す（自由記述の本文は残さない） */
function pickedValues(a: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of ['day', 'people', 'peopleTalk']) if (a[k]) out[k] = a[k]
  return out
}

export function CallScene({
  profile,
  weather,
  years,
  callIndex,
  prev,
  relation,
  dialed,
  ev,
  reduced,
  onEnd,
}: {
  /** その回に重なる出来事（真夜中・季節の節目は、ここで決める） */
  ev?: CallEvents
  profile: Profile
  weather: WeatherInfo | null
  reduced: boolean
  /** 何年後の自分につながったか */
  years: number
  /** 何回目の通話か（1から） */
  callIndex: number
  /** 前回の通話（2回目以降） */
  prev?: PrevCall
  /** 子孫が出たとき（「孫」など） */
  relation?: string
  /** 自分から年代を選んでかけた回 */
  dialed?: boolean
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
    name: profile.nickname.replace(/[{}]/g, ''),
    // 生まれる10年前の親は、今より少しだけ強い方言で話す
    dialect: relation === PARENT ? parentDialectFor(profile.prefCode) : dialectFor(profile.prefCode),
    lifestage: profile.lifestage,
    weather,
    hour: new Date().getHours(),
    years,
    age: profile.age ?? DEFAULT_AGE,
    futureAge: (profile.age ?? DEFAULT_AGE) + years,
    relation,
    gender: profile.gender,
    tier: tierFor(years, profile.age ?? DEFAULT_AGE, relation),
    topic: pickTopic(Math.random, prev?.topic),
    callIndex,
    script: scriptFor(callIndex, years, dialed),
    prev: prev && { ...prev, mention: !!prev.people && Math.random() < 0.5 },
    answers: {},
    ev: (() => {
      const hour = new Date().getHours()
      const self = !relation && years > 0
      return {
        ...ev,
        midnight: hour >= 2 && hour < 4,
        season: seasonDayOf(new Date(), loadBirthday()),
        // タイムカプセルと誕生日は、自分（未来）と話す回だけ
        capsule: !!ev?.capsule && self,
        askBirthday: !!ev?.askBirthday && self,
      }
    })(),
  })
  const [md, setMd] = useState({ m: '', d: '' })
  /** あなた（受け手）の話し方：選択肢も、自分の県の言い方にする（親と話す回でも、自分の言い方のまま） */
  const myDialect = dialectFor(profile.prefCode)
  const mine = (label: Choice['label']) => renderDialect(resolveText(label, ctx.current), myDialect)
  const answerLog = useRef<AnswerLog[]>([])
  const finalText = useRef('')
  const unitsRef = useRef(TOTAL_UNITS)
  const recallCount = useRef(0)
  const idRef = useRef(0)
  const skipRef = useRef<(() => void) | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sceneRef = useRef<HTMLElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const fastRef = useRef(false)
  const holdTimer = useRef<number | null>(null)
  const lowShown = useRef(false)
  const [fast, setFast] = useState(false)
  const alive = useRef(true)
  const started = useRef(false)
  const logEnd = useRef<HTMLDivElement>(null)
  const firstChoice = useRef<HTMLButtonElement>(null)

  const push = (e: Omit<Entry, 'id'>) => setLog((l) => [...l, { ...e, id: ++idRef.current }])

  /** 待ち時間。画面を長押ししている間は、FAST_RATE 倍の速さで進む */
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      let elapsed = 0
      const timer = window.setInterval(() => {
        elapsed += TICK * (fastRef.current ? FAST_RATE : 1)
        if (elapsed >= ms) done()
      }, TICK)
      function done() {
        window.clearInterval(timer)
        skipRef.current = null
        resolve()
      }
      skipRef.current = done
    })

  const startHold = () => {
    if (holdTimer.current) return
    holdTimer.current = window.setTimeout(() => {
      fastRef.current = true
      setFast(true)
    }, HOLD_DELAY)
  }
  const endHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
    fastRef.current = false
    setFast(false)
  }

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
    const forced = key === 'peopleTalk' && recallCount.current === 0
    if (!forced && Math.random() >= RECALL_CHANCE) return
    const line = recallFor(key, value, ctx.current)
    if (!line) return
    recallCount.current++
    await wait(500)
    await say([line])
  }

  /**
   * 度数を減らす。残りわずかの演出（3度）より前に下がりきらないよう、それまでは UNIT_FLOOR で止める。
   * 「残りわずか」以降は減らさない（最後の会話の途中で数字が増えたり戻ったりしないように）。
   */
  const spend = (n: number) => {
    if (lowShown.current) return
    unitsRef.current = Math.max(UNIT_FLOOR, unitsRef.current - n)
    setUnits(unitsRef.current)
  }

  const finish = useCallback(async () => {
    setPending(null)
    sound.busy()
    sound.duck(false)
    // 受話器を置いたら、最後の度数を使い切る（3 → 1。数字は増えない）
    unitsRef.current = Math.min(unitsRef.current, 1)
    setUnits(unitsRef.current)
    push({ who: 'system', text: '― 通話が終わりました ―' })
    setEnded(true)
    await new Promise((r) => window.setTimeout(r, 2200))
    if (!alive.current) return
    const a = ctx.current.answers
    onEnd({ answers: answerLog.current, finalMessage: finalText.current, usedUnits: TOTAL_UNITS - unitsRef.current, topic: ctx.current.topic, birthday: a.birthday || undefined, capsule: a.capsule || undefined, picks: pickedValues(a) })
  }, [onEnd])

  /** 混線：その日3回目の電話の最初に、知らない人の電話が混ざる（すぐに切れて、いつもの相手につながる） */
  const crossedLine = async () => {
    const lines: [Entry['who'], string, number][] = [
      ['system', 'ザザッ……ザ……', 1200],
      ['stranger', '……もしもし、お母さん？ あのね、今日ちょっと遅くなるかも。', 1600],
      ['me', '……えっ？', 1000],
      ['stranger', '……あれ？ ……すみません、間違えました。', 1400],
      ['system', 'ガチャッ……（混線していたみたい）', 1400],
    ]
    for (const [who, text, ms] of lines) {
      if (!alive.current) return
      if (who === 'stranger') {
        setTyping(true)
        await wait(900)
        setTyping(false)
      }
      push({ who, text })
      await wait(ms)
    }
  }

  const runNode = async (id: string | undefined) => {
    if (!alive.current) return
    const node = id ? NODES[id] : undefined
    if (!node) return finish()

    let voiced = false
    if (node.effect === 'voice') voiced = await sound.playVoice(profile.gender)
    if (node.effect === 'listen') sound.duck(false)
    if (node.effect === 'lowcard') {
      sound.pip()
      lowShown.current = true
      unitsRef.current = Math.min(unitsRef.current, UNIT_LOW)
      setUnits(unitsRef.current)
      push({ who: 'system', text: '残り度数が少なくなっています' })
      await wait(900)
    }
    if (node.say) await say(node.say(ctx.current), { finalFirst: node.effect === 'final', voiced })
    if (!alive.current) return

    if (node.choices) setPending({ kind: 'choices', node, choices: node.choices(ctx.current) })
    else if (node.input) {
      setInputValue('')
      const input = typeof node.input === 'function' ? node.input(ctx.current) : node.input
      setPending({ kind: 'input', node, input })
    } else await runNode(nextOf(node, ctx.current))
  }

  const choose = async (node: StoryNode, c: Choice) => {
    setPending(null)
    sound.click()
    const label = mine(c.label)
    // まわりの音を聞く場面が終わったら、通話の音量にゆっくり戻す
    if (node.effect === 'listen') sound.duck(true)
    push({ who: 'me', text: label })
    if (node.answerKey) ctx.current.answers[node.answerKey] = c.value
    const q = questionOf(node, ctx.current)
    if (q) answerLog.current.push({ key: node.answerKey ?? node.id, question: q, answer: label })
    spend(UNIT_STEP)
    await wait(400)
    if (c.reply) await say(c.reply)
    if (!c.next) await maybeRecall(node.id, c.value)
    await runNode(c.next ?? nextOf(node, ctx.current))
  }

  const submitInput = async (node: StoryNode, input: InputDef, skip: boolean) => {
    // 回答したらキーボードを閉じて、画面を元の表示に戻す
    inputRef.current?.blur()
    setPending(null)
    sound.click()
    const value = skip
      ? ''
      : input.kind === 'monthday'
        ? md.m && md.d
          ? `${md.m.padStart(2, '0')}-${md.d.padStart(2, '0')}`
          : ''
        : cleanInput(inputValue, input.maxLength)
    ctx.current.answers[input.key] = value
    const shown = input.kind === 'monthday' ? monthDayLabel(value) : value
    push({ who: 'me', text: shown || '……ひみつ。' })
    answerLog.current.push({ key: input.key, question: questionOf(node, ctx.current) ?? renderDialect(input.prompt, DIALECTS['13']), answer: shown || '（書かなかった）' })
    spend(UNIT_STEP)
    await wait(400)
    if (node.inputReply) await say(node.inputReply(value, ctx.current))
    if (value) await maybeRecall(input.key, 'input')
    await runNode(nextOf(node, ctx.current))
  }

  useEffect(() => {
    alive.current = true
    if (!started.current) {
      started.current = true
      sound.duck(true)
      // 会話の種類（初回・2回目・いつもの）で、始まりの場面を変える
      const start = { first: 'open', second: 'open2', regular: 'open3', dialed: 'open4' }[ctx.current.script]
      void (async () => {
        if (ctx.current.ev?.crossed) await crossedLine()
        await runNode(start)
      })()
    }
    return () => {
      alive.current = false
      skipRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 通話画面を「キーボードを除いた、見えている範囲」に固定する（LINE の入力画面と同じ形）。
   * キーボードが出ても、画面は入力欄に引っぱられず、入力欄は一番下に残る。
   */
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('call-lock')
    const vv = window.visualViewport
    const update = () => {
      const el = sceneRef.current
      if (!el) return
      const h = vv ? vv.height : window.innerHeight
      const top = vv ? vv.offsetTop : 0
      el.style.setProperty('--vvh', `${h}px`)
      el.style.setProperty('--vvtop', `${top}px`)
      // ページ自体はスクロールさせない。会話欄は、高さが変わったあとに最新の発言まで送る
      if (window.scrollY !== 0) window.scrollTo(0, 0)
      requestAnimationFrame(() => {
        const log = logRef.current
        if (log) log.scrollTop = log.scrollHeight
      })
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      root.classList.remove('call-lock')
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // 会話欄の大きさが変わったら（キーボードの出入り・入力欄の表示など）、最新の発言まで送る
  useEffect(() => {
    const log = logRef.current
    if (!log || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      log.scrollTop = log.scrollHeight
    })
    ro.observe(log)
    return () => ro.disconnect()
  }, [])

  // 入力欄が出たら、画面を動かさずにフォーカスする
  useEffect(() => {
    if (pending?.kind === 'input') {
      setMd({ m: '', d: '' })
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [pending])

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
    <section className="scene call-scene" ref={sceneRef}>
      <header className="call-head">
        <div>
          <p className="call-status">
            <span className={`dot${ended ? ' off' : ''}`} aria-hidden="true" />
            {ended ? '通話終了' : '通話中'}　<span className="mono">{formatDuration(elapsed)}</span>
          </p>
          <p className="call-name">{callerLabel(years, profile.nickname, relation)}</p>
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
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="通話の字幕"
        tabIndex={0}
        data-fast={fast}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            fastRef.current = true
            setFast(true)
          }
        }}
        onKeyUp={endHold}
        onBlur={endHold}
      >
        {log.map((e) => (
          <div key={e.id} className={`bubble ${e.who}${e.final ? ' final' : ''}`}>
            {e.who === 'future' && e.voiced && (
              <span className="voiced" aria-label="音声あり">
                ♪
              </span>
            )}
            {e.final && <span className="final-label">{callerLabel(years, profile.nickname, relation)} から、最後に</span>}
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
                {mine(c.label)}
              </button>
            ))}
          </div>
        )}
        {pending?.kind === 'input' &&  (
          <form
            className="free-input"
            onSubmit={(e) => {
              e.preventDefault()
              void submitInput(pending.node, pending.input, false)
            }}
          >
            <label htmlFor="free" className="free-label">
              {renderDialect(pending.input.prompt, myDialect)}
            </label>
            {pending.input.kind === 'monthday' ? (
              <div className="free-row md-row">
                <select id="free" className="text-input" aria-label="月" value={md.m} onChange={(e) => { const m = e.target.value; setMd((v) => ({ m, d: m && Number(v.d) > new Date(2024, Number(m), 0).getDate() ? '' : v.d })) }}>
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={String(i + 1)}>
                      {i + 1}月
                    </option>
                  ))}
                </select>
                <select className="text-input" aria-label="日" value={md.d} onChange={(e) => setMd((v) => ({ ...v, d: e.target.value }))}>
                  <option value="">日</option>
                  {Array.from({ length: md.m ? new Date(2024, Number(md.m), 0).getDate() : 31 }, (_, i) => (
                    <option key={i} value={String(i + 1)}>
                      {i + 1}日
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn primary small" disabled={!md.m || !md.d}>
                  伝える
                </button>
              </div>
            ) : (
              <>
              <div className="free-row">
                <input
                  id="free"
                  ref={inputRef}
                  className="text-input"
                  type="text"
                  enterKeyHint="send"
                  autoComplete="off"
                  maxLength={pending.input.maxLength}
                  placeholder={renderDialect(pending.input.placeholder, myDialect)}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button type="submit" className="btn primary small" disabled={!inputValue.trim()}>
                  伝える
                </button>
              </div>
              <p className="char-count" aria-live="polite">
                {[...inputValue].length}/{pending.input.maxLength}
              </p>
              </>
            )}
            <button type="button" className="btn ghost small" onClick={() => void submitInput(pending.node, pending.input, true)}>
              {pending.input.kind === 'monthday' ? '言わずに答える' : '書かずに答える'}
            </button>
          </form>
        )}
        {!pending && !ended && <p className="tap-hint">{fast ? '早送り中…' : '画面を長押しすると、早く進みます'}</p>}
      </div>
    </section>
  )
}
