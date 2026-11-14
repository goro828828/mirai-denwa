import { MAX_PLAYER_AGE, MIN_PLAYER_AGE } from '../story/engine'
import type { WeatherKind } from '../types'
import { TitleLandscape, groundHeightFor, skyIsDark, type Season } from '../components/TitleLandscape'
import type { TimeOfDay } from '../lib/weather'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CardForm, CardFront, GENDER_LABEL, LIFESTAGE_LABEL, type FormField } from '../components/PhoneCard'
import { PREFECTURES, REGIONS } from '../data/prefectures'
import type { Gender, LifeStage, Profile } from '../types'
import { sound } from '../lib/sound'

export function TitleScene({
  onStart,
  onHistory,
  historyCount,
  saved,
  onEditProfile,
  landscape,
}: {
  onStart: () => void
  onHistory: () => void
  historyCount: number
  /** 登録済みの内容（2回目以降） */
  saved: Profile | null
  onEditProfile: () => void
  /** 背景の風景（時間帯・天気・季節） */
  landscape: { tod: TimeOfDay; weather: WeatherKind | null; season: Season }
}) {
  // 下のボタン欄の高さ（登録内容の行が出るかどうか・画面の大きさで変わる）に合わせて、
  // 電話ボックスの足もとが、ボタン欄より少し上に来るように地面を動かす
  const sectionRef = useRef<HTMLElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const fit = () => {
      const sec = sectionRef.current
      const stack = stackRef.current
      if (!sec || !stack) return
      const top = stack.getBoundingClientRect().top
      sec.style.setProperty('--tl-ground-h', `${groundHeightFor(window.innerWidth, window.innerHeight, top - 18)}px`)
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    if (stackRef.current) ro?.observe(stackRef.current)
    window.addEventListener('resize', fit)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [saved])

  return (
    <section ref={sectionRef} className={`scene title-scene${skyIsDark(landscape.tod, landscape.weather) ? ' title-dark' : ' title-light'}`}>
      <TitleLandscape {...landscape} />
      <div className="title-block">
        <p className="title-eyebrow">いつか懐かしくなる今日を、あなたはどう過ごしますか。</p>
        <h1 className="title app-name">みらい電話</h1>
      </div>
      <div className="stack" ref={stackRef}>
        <div className="title-actions">
          <button type="button" className="btn primary" onClick={onStart}>
            はじめる
          </button>
          <button type="button" className="btn ghost" onClick={onHistory}>
            通話履歴{historyCount > 0 ? `（${historyCount}）` : ''}
          </button>
        </div>
        {saved && (
          <p className="saved-profile">
            <span>
              {saved.nickname}（{PREFECTURES.find((p) => p.code === saved.prefCode)?.name}）として遊びます
            </span>
            <button type="button" className="btn text small" onClick={onEditProfile}>
              登録内容を変更
            </button>
          </p>
        )}
        <p className="note">音が出ます。音なしでも、字幕で最後まで遊べます。<br />現在地の天気を使うため、位置情報の許可をたずねます（任意・保存しません）。</p>
      </div>
    </section>
  )
}

const PICKUP_LINES = ['いつもの帰り道。', '足もとに、見慣れないカードが一枚、落ちていた。']
const PICKUP_LINES_AGAIN = ['いつもの帰り道。', 'また、あのカードが落ちていた。']

export function PickupScene({
  reduced,
  saved,
  onDone,
  onUse,
  onEdit,
  onWarp,
}: {
  reduced: boolean
  /** 初回だけの導入：拾った瞬間、知らないあぜ道へ（裏返さずに次の場面へ） */
  onWarp?: () => void
  /** 登録済みの内容（2回目以降）。あれば記入済みのカードを出す */
  saved: Profile | null
  /** 初めて：カードに書きこむ */
  onDone: () => void
  /** 2回目以降：このカードで電話をかける */
  onUse: () => void
  /** 2回目以降：書き直す */
  onEdit: () => void
}) {
  const LINES = saved ? PICKUP_LINES_AGAIN : PICKUP_LINES
  const [shown, setShown] = useState(reduced ? 2 : 0)
  const [stage, setStage] = useState<'ground' | 'front' | 'back'>('ground')

  useEffect(() => {
    if (shown >= LINES.length) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : 1400)
    return () => window.clearTimeout(t)
  }, [shown, LINES.length])

  const ready = shown >= LINES.length

  // 初回の導入：拾い上げたあと、まわりの音が遠のき、白くとぶ
  const [warping, setWarping] = useState(false)
  useEffect(() => {
    if (!onWarp || stage !== 'front') return
    const a = window.setTimeout(() => setWarping(true), 2400)
    const b = window.setTimeout(onWarp, 2400 + (reduced ? 300 : 1600))
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [onWarp, stage, reduced])

  return (
    <section className={`scene pickup-scene${warping ? ' warp-out' : ''}`}>
      <div className="narration" aria-live="polite">
        {LINES.slice(0, shown).map((l) => (
          <p key={l} className="fade-in">
            {l}
          </p>
        ))}
        {stage !== 'ground' && (
          <p className="fade-in">
            {stage === 'front' && onWarp
              ? '拾い上げた、その瞬間——まわりの音が、すっと遠のいた。'
              : stage === 'front'
              ? saved
                ? '拾い上げると、見覚えのあるテレフォンカードだった。'
                : '拾い上げると、それは古いテレフォンカードだった。'
              : saved
                ? '裏には、前に書いた文字が、そのまま残っている。'
                : '裏には、なにかを書きこむ欄がある。'}
          </p>
        )}
      </div>

      <div className={`pickup-stage stage-${stage}`}>
        {stage === 'ground' ? (
          <button
            type="button"
            className={`ground-card${ready ? ' ready' : ''}`}
            onClick={() => {
              sound.click()
              setStage('front')
            }}
            disabled={!ready}
            aria-label="落ちているカードを拾う"
          >
            <CardFront />
          </button>
        ) : (
          <div className={`flip${stage === 'back' ? ' flipped' : ''}`}>
            <div className="flip-face flip-front">
              <CardFront />
            </div>
            <div className="flip-face flip-back">
              <CardForm values={saved ?? {}} />
            </div>
          </div>
        )}
      </div>

      <div className="stack bottom">
        {stage === 'ground' && <p className="hint">{ready ? 'カードをタップして拾う' : ' '}</p>}
        {stage === 'front' && !onWarp && (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              sound.click()
              setStage('back')
            }}
          >
            裏返してみる
          </button>
        )}
        {stage === 'back' && !saved && (
          <button type="button" className="btn primary" onClick={onDone}>
            カードに書きこむ
          </button>
        )}
        {stage === 'back' && saved && (
          <>
            <button type="button" className="btn primary" onClick={onUse}>
              このカードで電話をかける
            </button>
            <button type="button" className="btn ghost" onClick={onEdit}>
              書き直す
            </button>
          </>
        )}
      </div>
    </section>
  )
}

const STEPS: FormField[] = ['nickname', 'gender', 'age', 'prefCode', 'lifestage']
const AGES = Array.from({ length: MAX_PLAYER_AGE - MIN_PLAYER_AGE + 1 }, (_, i) => MIN_PLAYER_AGE + i)
const STEP_TITLE: Record<FormField, string> = {
  nickname: 'なんて呼ばれたい？',
  gender: '性別は？',
  age: 'いま、何歳？',
  prefCode: 'どこに住んでいる？',
  lifestage: 'いまの自分は？',
}
const STEP_HELP: Record<FormField, string> = {
  nickname: '未来の自分が、この名前であなたを呼びます。ニックネームで大丈夫です。',
  gender: '最初のひとことの声に使います。答えなくても遊べます。',
  age: '未来の自分の年齢に使います（10〜90歳）。電話がつながるのは、未来の自分が100歳になるまでです。',
  prefCode: '話し方に使います。位置情報を許可していない場合は、天気にも使います。',
  lifestage: '会話の言葉選びに使います。',
}

export function FillScene({
  initial,
  onPrefChange,
  onDone,
  submitLabel = '公衆電話をさがす',
  lead,
}: {
  /** カードの上に出す一文（初回の導入で使う） */
  lead?: string
  /** 最後のボタンの文言（登録内容の変更だけのときは「保存する」） */
  submitLabel?: string
  initial: Partial<Profile>
  onPrefChange: (code: string) => void
  onDone: (p: Profile) => void
}) {
  const [values, setValues] = useState<Partial<Profile>>(initial)
  // 書きかけ（例：年齢だけ未記入の古い登録）は、まだ書いていない項目から始める
  const [step, setStep] = useState(() => {
    const i = STEPS.findIndex((f) => (f === 'nickname' ? !initial.nickname : !initial[f as keyof Profile]))
    return i < 0 ? 0 : i
  })
  const field = STEPS[step]
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [step])

  const valid: Record<FormField, boolean> = {
    nickname: !!values.nickname?.trim(),
    gender: !!values.gender,
    age: !!values.age && values.age >= MIN_PLAYER_AGE && values.age <= MAX_PLAYER_AGE,
    prefCode: !!values.prefCode,
    lifestage: !!values.lifestage,
  }
  const allValid = STEPS.every((s) => valid[s])
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (!valid[field]) return
    sound.click()
    if (!isLast) return setStep((s) => s + 1)
    if (!allValid) return setStep(STEPS.findIndex((s) => !valid[s]))
    onDone({
      nickname: values.nickname!.trim(),
      gender: values.gender!,
      age: values.age!,
      prefCode: values.prefCode!,
      lifestage: values.lifestage!,
    })
  }

  const chips = <T extends string>(options: Record<T, string>, key: 'gender' | 'lifestage') => (
    <div className="chips" role="radiogroup" aria-label={STEP_TITLE[key]}>
      {(Object.keys(options) as T[]).map((k) => (
        <button
          type="button"
          key={k}
          role="radio"
          aria-checked={values[key] === k}
          className={`chip${values[key] === k ? ' on' : ''}`}
          onClick={() => {
            sound.click()
            setValues((v) => ({ ...v, [key]: k }))
          }}
        >
          {options[k]}
        </button>
      ))}
    </div>
  )

  return (
    <section className="scene fill-scene">
      {lead && <p className="fill-lead fade-in">{lead}</p>}
      <div className="fill-card">
        <CardForm values={values} active={field} onSelect={(f) => setStep(STEPS.indexOf(f))} />
      </div>

      <form
        className="pen-panel"
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
      >
        <div className="pen-head">
          <h2 id="pen-title">{STEP_TITLE[field]}</h2>
          <span className="step-count" aria-label={`${STEPS.length}項目中${step + 1}項目め`}>
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <p className="help" id="pen-help">
          {STEP_HELP[field]}
        </p>

        {field === 'nickname' && (
          <input
            ref={(el) => {
              inputRef.current = el
            }}
            className="text-input"
            type="text"
            inputMode="text"
            autoComplete="nickname"
            maxLength={10}
            placeholder="例：はる"
            aria-labelledby="pen-title"
            aria-describedby="pen-help"
            value={values.nickname ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, nickname: e.target.value }))}
          />
        )}
        {field === 'gender' && chips<Gender>(GENDER_LABEL, 'gender')}
        {field === 'age' && (
          <select
            ref={(el) => {
              inputRef.current = el
            }}
            className="select"
            aria-labelledby="pen-title"
            aria-describedby="pen-help"
            value={values.age ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, age: Number(e.target.value) || undefined }))}
          >
            <option value="" disabled>
              年齢を選ぶ
            </option>
            {AGES.map((a) => (
              <option key={a} value={a}>
                {a}歳
              </option>
            ))}
          </select>
        )}
        {field === 'prefCode' && (
          <select
            ref={(el) => {
              inputRef.current = el
            }}
            className="select"
            aria-labelledby="pen-title"
            aria-describedby="pen-help"
            value={values.prefCode ?? ''}
            onChange={(e) => {
              setValues((v) => ({ ...v, prefCode: e.target.value }))
              if (e.target.value) onPrefChange(e.target.value)
            }}
          >
            <option value="" disabled>
              都道府県を選ぶ
            </option>
            {REGIONS.map((r) => (
              <optgroup key={r} label={r}>
                {PREFECTURES.filter((p) => p.region === r).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        {field === 'lifestage' && chips<LifeStage>(LIFESTAGE_LABEL, 'lifestage')}

        <div className="pen-actions">
          {step > 0 && (
            <button type="button" className="btn ghost small" onClick={() => setStep((s) => s - 1)}>
              もどる
            </button>
          )}
          <button type="submit" className="btn primary" disabled={!valid[field]}>
            {isLast ? submitLabel : 'つぎへ'}
          </button>
        </div>
      </form>
    </section>
  )
}
