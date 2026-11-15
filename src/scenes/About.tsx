/**
 * 初めて開いたときだけ、ホーム画面の前に出す「このアプリについて」
 * アプリの根幹：誰かに見せるための記録ではなく、飾らない今の自分を残す。
 * 10年後の自分との不思議な電話で、未来の自分が懐かしむ今日を、今の自分が生きていると気づく。
 * 最後の一文（コンセプトの核）は太字で出す。
 */
import { useEffect, useState } from 'react'

const LINES = [
  '日常は、いつでも\n誰かに見せられるようになった。',
  'でも、素直な気持ちや、\nなんでもない一日は、\n意外と残せていない。',
  'ある日、10年後の自分から、\n不思議な電話がかかってくる。',
  '飾らない今日のことを、\n少しだけ、話してみませんか。',
  '未来の自分が懐かしむ今日を、\n今のあなたは生きている。',
]

/** 1文を読む時間：文字数に合わせて長めに（最初の1文は少し早めに出す） */
const readMs = (line: string) => 3200 + [...line].length * 90

export function AboutScene({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const [shown, setShown] = useState(reduced ? LINES.length : 1)
  useEffect(() => {
    if (shown >= LINES.length) return
    const t = window.setTimeout(() => setShown((n) => n + 1), readMs(LINES[shown - 1]))
    return () => window.clearTimeout(t)
  }, [shown])
  const ready = shown >= LINES.length
  // 画面をタップすると、次の文をすぐに出す（自分のペースで読める）
  const next = () => {
    if (!ready) setShown((n) => n + 1)
  }
  return (
    <section className="scene about-scene" onClick={next}>
      <div className="about-lines" aria-live="polite">
        {LINES.slice(0, shown).map((l) => (
          <p key={l} className="about-line">
            {l.split('\n').map((part, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {part}
              </span>
            ))}
          </p>
        ))}
      </div>
      <div className="stack bottom">
        {ready ? (
          <button type="button" className="btn primary fade-in" onClick={onDone}>
            みらい電話をひらく
          </button>
        ) : (
          <p className="hint about-hint">画面をタップすると、次へ進みます</p>
        )}
      </div>
    </section>
  )
}
