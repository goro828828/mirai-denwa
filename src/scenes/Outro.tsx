import { useEffect, useRef, useState } from 'react'
import type { CallRecord } from '../types'
import { renderCardPng } from '../lib/cardImage'
import { canShareFiles, saveCard, shareCard, xIntentUrl } from '../lib/share'
import { formatDateTime, weatherText } from '../lib/format'
import { CardPrinted, GENDER_LABEL, LIFESTAGE_LABEL } from '../components/PhoneCard'

function useCardUrl(record: CallRecord | null) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!record) return
    let revoked = false
    let made: string | null = null
    setUrl(null)
    setError(false)
    renderCardPng(record)
      .then((b) => {
        if (revoked) return
        made = URL.createObjectURL(b)
        setUrl(made)
      })
      .catch(() => setError(true))
    return () => {
      revoked = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [record])
  return { url, error }
}

function CardActions({ record }: { record: CallRecord }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const shareFiles = canShareFiles()

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
    } catch {
      setMsg('画像を作れませんでした。もう一度お試しください。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn primary" disabled={busy} onClick={() => run(async () => {
        await saveCard(record)
        setMsg('画像を保存しました。見つからない場合は、上のカード画像を長押しして保存できます。')
      })}>
        カードを画像で保存
      </button>
      {shareFiles ? (
        <button type="button" className="btn ghost" disabled={busy} onClick={() => run(async () => {
          const r = await shareCard(record)
          if (r === 'unsupported') setMsg('この端末では共有できませんでした。画像を保存してから投稿してください。')
        })}>
          カードを共有する
        </button>
      ) : (
        <a className="btn ghost" href={xIntentUrl(record)} target="_blank" rel="noopener noreferrer">
          Xに投稿する
        </a>
      )}
      <p className="note">{shareFiles ? '共有されるのはカードの画像だけです。' : 'Xに画像を載せるときは、保存した画像を添付してください。'}あなたの回答は含まれません。</p>
      {msg && (
        <p className="toast" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}

function AnswerList({ record }: { record: CallRecord }) {
  return (
    <details className="answers">
      <summary>通話の記録を見る（この端末だけに保存）</summary>
      <dl>
        <dt>性別</dt>
        <dd>{GENDER_LABEL[record.gender]}</dd>
        <dt>いまの自分</dt>
        <dd>{LIFESTAGE_LABEL[record.lifestage]}</dd>
        <dt>天気</dt>
        <dd>{weatherText(record.weather)}</dd>
        {record.answers.map((a, i) => (
          <div key={i} className="qa">
            <dt>{a.question}</dt>
            <dd>{a.answer}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

export function ResultScene({ record, onHistory, onAgain }: { record: CallRecord; onHistory: () => void; onAgain: () => void }) {
  const { url, error } = useCardUrl(record)
  return (
    <section className="scene result-scene">
      <h2 className="scene-title">未来からのカード</h2>
      <div className="card-image">
        {url ? (
          <img src={url} alt={`テレフォンカード。${record.years ?? 10}年後の${record.nickname}より：${record.finalMessage}`} />
        ) : error ? (
          <CardPrinted record={record} />
        ) : (
          <div className="card-skeleton" aria-label="カードを用意しています" />
        )}
      </div>
      <CardActions record={record} />
      <AnswerList record={record} />
      <div className="stack">
        <button type="button" className="btn ghost" onClick={onHistory}>
          通話履歴を見る
        </button>
        <button type="button" className="btn text" onClick={onAgain}>
          タイトルへもどる
        </button>
      </div>
    </section>
  )
}

export function HistoryScene({
  records,
  onDelete,
  onClear,
  onBack,
}: {
  records: CallRecord[]
  onDelete: (id: string) => void
  onClear: () => void
  onBack: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const open = records.find((r) => r.id === openId) ?? null
  const { url } = useCardUrl(open)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [openId])

  if (open) {
    return (
      <section className="scene history-scene">
        <button type="button" className="btn text back" onClick={() => setOpenId(null)}>
          ← 履歴の一覧へ
        </button>
        <h2 className="scene-title" tabIndex={-1} ref={headingRef}>
          {formatDateTime(open.createdAt)}
        </h2>
        <div className="card-image">
          {url ? <img src={url} alt={`テレフォンカード。${open.years ?? 10}年後の${open.nickname}より：${open.finalMessage}`} /> : <div className="card-skeleton" />}
        </div>
        <CardActions record={open} />
        <AnswerList record={open} />
      </section>
    )
  }

  return (
    <section className="scene history-scene">
      <button type="button" className="btn text back" onClick={onBack}>
        ← もどる
      </button>
      <h2 className="scene-title" tabIndex={-1} ref={headingRef}>
        通話履歴
      </h2>
      <p className="note left">履歴はこの端末のブラウザにだけ保存されています。端末の変更やブラウザのデータ削除で消えることがあります。</p>
      {records.length === 0 ? (
        <div className="empty">
          <p>まだ通話の記録はありません。</p>
          <button type="button" className="btn primary" onClick={onBack}>
            はじめての通話をする
          </button>
        </div>
      ) : (
        <>
          <ul className="history-list">
            {records.map((r) => (
              <li key={r.id} className="history-item">
                <button type="button" className="history-main" onClick={() => setOpenId(r.id)}>
                  <span className="h-date">{formatDateTime(r.createdAt)}</span>
                  <span className="h-meta">
                    {r.nickname}・{r.prefName}・{weatherText(r.weather)}
                  </span>
                  <span className="h-msg">{r.finalMessage}</span>
                </button>
                {confirmId === r.id ? (
                  <div className="confirm" role="group" aria-label="削除の確認">
                    <span>この記録を削除しますか？</span>
                    <button type="button" className="btn danger small" onClick={() => onDelete(r.id)}>
                      削除する
                    </button>
                    <button type="button" className="btn ghost small" onClick={() => setConfirmId(null)}>
                      やめる
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn text small" onClick={() => setConfirmId(r.id)}>
                    削除
                  </button>
                )}
              </li>
            ))}
          </ul>
          {confirmAll ? (
            <div className="confirm" role="group" aria-label="すべて削除の確認">
              <span>{records.length}件の記録をすべて削除しますか？ 元に戻せません。</span>
              <button type="button" className="btn danger small" onClick={() => { onClear(); setConfirmAll(false) }}>
                すべて削除する
              </button>
              <button type="button" className="btn ghost small" onClick={() => setConfirmAll(false)}>
                やめる
              </button>
            </div>
          ) : (
            <button type="button" className="btn text small" onClick={() => setConfirmAll(true)}>
              履歴をすべて削除
            </button>
          )}
        </>
      )}
    </section>
  )
}
