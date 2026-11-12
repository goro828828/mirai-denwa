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

export function AboutScene({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const [shown, setShown] = useState(reduced ? LINES.length : 0)
  useEffect(() => {
    if (shown >= LINES.length) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 700 : 2000)
    return () => window.clearTimeout(t)
  }, [shown])
  const ready = shown >= LINES.length
  return (
    <section className="scene about-scene">
      <div className="about-lines" aria-live="polite">
        {LINES.slice(0, shown).map((l) => (
          <p key={l} className="fade-in">
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
          <button type="button" className="btn text small" onClick={() => setShown(LINES.length)}>
            すべて表示する
          </button>
        )}
      </div>
    </section>
  )
}
