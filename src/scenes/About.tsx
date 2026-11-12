/**
 * 初めて開いたときだけ、ホーム画面の前に出す「このアプリについて」
 * アプリの根幹：なんでもない一日に、未来の自分から電話がかかってくる。
 * 何年もたってからしか気づけない「あの日は大切だった」という感覚を、今日のうちに味わい、今日を大切にする。いわば日記アプリ。
 */
import { useEffect, useState } from 'react'

const LINES = [
  'なんでもない一日に、未来の自分から電話がかかってくる。',
  '「あの日は、大切な一日だった」\nふつうは、何年もたってからしか気づけないこと。',
  'それを、今日のうちに。',
  'みらい電話は、いつか懐かしくなる今日を大切にするための、\n電話のかたちをした日記です。',
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
