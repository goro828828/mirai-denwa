import { useEffect, useRef, useState } from 'react'
import { CardForm, CardFront, GENDER_LABEL, LIFESTAGE_LABEL, type FormField } from '../components/PhoneCard'
import { PREFECTURES, REGIONS } from '../data/prefectures'
import type { Gender, LifeStage, Profile } from '../types'
import { sound } from '../lib/sound'

export function TitleScene({ onStart, onHistory, historyCount }: { onStart: () => void; onHistory: () => void; historyCount: number }) {
  return (
    <section className="scene title-scene">
      <div className="title-block">
        <p className="title-eyebrow">いつか懐かしくなる今日を、あなたはどう過ごしますか。</p>
        <h1 className="title">
          未来の自分から、
          <br />
          着信です。
        </h1>
      </div>
      <div className="stack">
        <button type="button" className="btn primary" onClick={onStart}>
          はじめる
        </button>
        <button type="button" className="btn ghost" onClick={onHistory}>
          通話履歴{historyCount > 0 ? `（${historyCount}）` : ''}
        </button>
        <p className="note">音が出ます。音なしでも、字幕で最後まで遊べます。<br />現在地の天気を使うため、位置情報の許可をたずねます（任意・保存しません）。</p>
      </div>
    </section>
  )
}

const PICKUP_LINES = ['いつもの帰り道。', '足もとに、見慣れないカードが一枚、落ちていた。']

export function PickupScene({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const [shown, setShown] = useState(reduced ? PICKUP_LINES.length : 0)
  const [stage, setStage] = useState<'ground' | 'front' | 'back'>('ground')

  useEffect(() => {
    if (shown >= PICKUP_LINES.length) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : 1400)
    return () => window.clearTimeout(t)
  }, [shown])

  const ready = shown >= PICKUP_LINES.length

  return (
    <section className="scene pickup-scene">
      <div className="narration" aria-live="polite">
        {PICKUP_LINES.slice(0, shown).map((l) => (
          <p key={l} className="fade-in">
            {l}
          </p>
        ))}
        {stage !== 'ground' && (
          <p className="fade-in">{stage === 'front' ? '拾い上げると、それは古いテレフォンカードだった。' : '裏には、なにかを書きこむ欄がある。'}</p>
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
              <CardForm values={{}} />
            </div>
          </div>
        )}
      </div>

      <div className="stack bottom">
        {stage === 'ground' && <p className="hint">{ready ? 'カードをタップして拾う' : ' '}</p>}
        {stage === 'front' && (
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
        {stage === 'back' && (
          <button type="button" className="btn primary" onClick={onDone}>
            カードに書きこむ
          </button>
        )}
      </div>
    </section>
  )
}

const STEPS: FormField[] = ['nickname', 'gender', 'prefCode', 'lifestage']
const STEP_TITLE: Record<FormField, string> = {
  nickname: 'なんて呼ばれたい？',
  gender: '性別は？',
  prefCode: 'どこに住んでいる？',
  lifestage: 'いまの自分は？',
}
const STEP_HELP: Record<FormField, string> = {
  nickname: '未来の自分が、この名前であなたを呼びます。ニックネームで大丈夫です。',
  gender: '最初のひとことの声に使います。答えなくても遊べます。',
  prefCode: '話し方に使います。位置情報を許可していない場合は、天気にも使います。',
  lifestage: '会話の言葉選びに使います。',
}

export function FillScene({
  initial,
  onPrefChange,
  onDone,
}: {
  initial: Partial<Profile>
  onPrefChange: (code: string) => void
  onDone: (p: Profile) => void
}) {
  const [values, setValues] = useState<Partial<Profile>>(initial)
  const [step, setStep] = useState(0)
  const field = STEPS[step]
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [step])

  const valid: Record<FormField, boolean> = {
    nickname: !!values.nickname?.trim(),
    gender: !!values.gender,
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
            {isLast ? '公衆電話をさがす' : 'つぎへ'}
          </button>
        </div>
      </form>
    </section>
  )
}
