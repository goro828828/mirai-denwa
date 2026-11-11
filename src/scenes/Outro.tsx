import { useEffect, useRef, useState } from 'react'
import type { CallRecord } from '../types'
import { renderCardPng } from '../lib/cardImage'
import { canShareFiles, saveCard, saveMode, shareCard, xIntentUrl } from '../lib/share'
import { formatDateTime, weatherText } from '../lib/format'
import { CardPrinted, GENDER_LABEL, LIFESTAGE_LABEL } from '../components/PhoneCard'
import { callerLabel } from '../story/engine'
import { HistoryCalendar } from '../components/HistoryCalendar'

function useCardUrl(record: CallRecord | null) {
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!record) return
    let revoked = false
    let made: string | null = null
    setUrl(null)
    setBlob(null)
    setError(false)
    renderCardPng(record)
      .then((b) => {
        if (revoked) return
        setBlob(b)
        made = URL.createObjectURL(b)
        setUrl(made)
      })
      .catch(() => setError(true))
    return () => {
      revoked = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [record])
  return { url, blob, error }
}

const SAVE_LABEL = { photos: '写真に保存', gallery: '写真に保存', download: 'カードを画像で保存' } as const
// 保存後のひとこと（iPhone は保存メニューで本人が選ぶので、何も出さない）
const SAVED_MSG = {
  photos: '',
  gallery: '写真に保存しました。',
  download: '画像を保存しました。',
} as const

function CardActions({ record, blob }: { record: CallRecord; blob: Blob | null }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const shareFiles = canShareFiles()
  const mode = saveMode()

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
        const r = await saveCard(record, blob)
        if (r !== 'cancelled') setMsg(SAVED_MSG[r])
      })}>
        {SAVE_LABEL[mode]}
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
  const { url, blob, error } = useCardUrl(record)
  return (
    <section className="scene result-scene">
      <h2 className="scene-title">未来からのカード</h2>
      <div className="card-image">
        {url ? (
          <img src={url} alt={`テレフォンカード。${callerLabel(record.years ?? 10, record.nickname, record.relation)}より：${record.finalMessage}`} />
        ) : error ? (
          <CardPrinted record={record} />
        ) : (
          <div className="card-skeleton" aria-label="カードを用意しています" />
        )}
      </div>
      <CardActions record={record} blob={blob} />
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
  /** 一覧（いつもの表示）か、カレンダーか */
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const open = records.find((r) => r.id === openId) ?? null
  const { url, blob } = useCardUrl(open)
  /** 表示を切り替えたら、いつも画面の先頭から見せる（切り替えボタンの位置がずれないように） */
  const switchView = (v: 'list' | 'calendar') => {
    setView(v)
    window.scrollTo(0, 0)
  }
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [openId])

  const renderList = (list: CallRecord[]) => (
    <ul className="history-list">
      {list.map((r) => (
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
  )

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
          {url ? <img src={url} alt={`テレフォンカード。${callerLabel(open.years ?? 10, open.nickname, open.relation)}より：${open.finalMessage}`} /> : <div className="card-skeleton" />}
        </div>
        <CardActions record={open} blob={blob} />
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
      <p className="note left history-note">履歴はこの端末のブラウザにだけ保存されています。端末の変更やブラウザのデータ削除で消えることがあります。</p>
      {records.length === 0 ? (
        <div className="empty">
          <p>まだ通話の記録はありません。</p>
          <button type="button" className="btn primary" onClick={onBack}>
            はじめての通話をする
          </button>
        </div>
      ) : (
        <>
          <div className="view-switch" role="group" aria-label="表示の切り替え">
            <button type="button" aria-pressed={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={() => switchView('list')}>
              一覧
            </button>
            <button type="button" aria-pressed={view === 'calendar'} className={view === 'calendar' ? 'on' : ''} onClick={() => switchView('calendar')}>
              カレンダー
            </button>
          </div>
          {view === 'list' ? renderList(records) : <HistoryCalendar records={records} renderItems={renderList} />}
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
