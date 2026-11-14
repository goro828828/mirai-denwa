import { useEffect, useRef } from 'react'
import type { Capsule } from '../lib/storage'

const dateLabel = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** タイムカプセル：1年前の自分からの手紙が届いた */
export function LetterDialog({ letters, onClose }: { letters: Capsule[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog ref={ref} className="sheet letter" aria-labelledby="letter-title" onClose={onClose} onCancel={onClose}>
      <p className="letter-eyebrow">タイムカプセル</p>
      <h2 id="letter-title">1年前の自分から、手紙が届きました</h2>
      {letters.map((l) => (
        <figure key={l.id} className="letter-body">
          <blockquote>{l.text}</blockquote>
          <figcaption>{dateLabel(l.writtenAt)}の通話で、書いたことば</figcaption>
        </figure>
      ))}
      <button type="button" className="btn primary" onClick={() => ref.current?.close()}>
        手紙をしまう
      </button>
    </dialog>
  )
}
