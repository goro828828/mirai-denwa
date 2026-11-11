import { useMemo, useState, type ReactNode } from 'react'
import type { CallRecord } from '../types'
import { ILLUSTRATIONS, illustrationOf } from '../lib/illustrations'

const WD = ['日', '月', '火', '水', '木', '金', '土']

/** 端末の時刻での「その日」 */
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth()

const thumbCache = new Map<string, string>()
function thumb(key: ReturnType<typeof illustrationOf>): string {
  let u = thumbCache.get(key)
  if (!u) {
    u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ILLUSTRATIONS[key].svg)
    thumbCache.set(key, u)
  }
  return u
}

/**
 * 通話履歴のカレンダー表示
 * 電話した日は、その日のカードの挿絵がスタンプのように入る。日付をタップすると、その日の記録が下に出る。
 */
export function HistoryCalendar({ records, renderItems }: { records: CallRecord[]; renderItems: (list: CallRecord[]) => ReactNode }) {
  // 日ごとにまとめる（新しい順のまま）
  const byDay = useMemo(() => {
    const m = new Map<string, CallRecord[]>()
    for (const r of records) {
      const k = dayKey(new Date(r.createdAt))
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return m
  }, [records])

  const today = new Date()
  const latest = records[0] ? new Date(records[0].createdAt) : today
  const oldest = records.length ? new Date(records[records.length - 1].createdAt) : today
  const minMonth = Math.min(monthIndex(oldest), monthIndex(today))
  const maxMonth = Math.max(monthIndex(latest), monthIndex(today))

  const [month, setMonth] = useState(() => monthIndex(latest))
  const [selected, setSelected] = useState<string | null>(() => (records[0] ? dayKey(latest) : null))

  const year = Math.floor(month / 12)
  const mon = month % 12
  const first = new Date(year, mon, 1)
  const days = new Date(year, mon + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))

  const calledDays = Array.from({ length: days }, (_, i) => byDay.has(dayKey(new Date(year, mon, i + 1)))).filter(Boolean).length

  const go = (delta: number) => {
    const next = month + delta
    setMonth(next)
    // その月でいちばん新しい「電話した日」を選んでおく
    const y = Math.floor(next / 12)
    const m = next % 12
    const hit = records.find((r) => {
      const d = new Date(r.createdAt)
      return d.getFullYear() === y && d.getMonth() === m
    })
    setSelected(hit ? dayKey(new Date(hit.createdAt)) : null)
  }

  const selList = selected ? byDay.get(selected) ?? [] : []
  const selDate = selected ? (() => {
    const [y, m, d] = selected.split('-').map(Number)
    return new Date(y, m - 1, d)
  })() : null

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="前の月" disabled={month <= minMonth} onClick={() => go(-1)}>
          ‹
        </button>
        <h3 className="cal-title" aria-live="polite">
          {year}年{mon + 1}月
        </h3>
        <button type="button" className="cal-nav" aria-label="次の月" disabled={month >= maxMonth} onClick={() => go(1)}>
          ›
        </button>
      </div>
      <p className="cal-summary">{calledDays ? `この月は、${calledDays}日 電話をしました。` : 'この月は、まだ電話をしていません。'}</p>

      <table className="cal-grid">
        <thead>
          <tr>
            {WD.map((w, i) => (
              <th key={w} scope="col" className={i === 0 ? 'sun' : i === 6 ? 'sat' : undefined}>
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((d, i) => {
                if (d === null) return <td key={i} />
                const date = new Date(year, mon, d)
                const k = dayKey(date)
                const list = byDay.get(k)
                const isToday = k === dayKey(today)
                const cls = `cal-day${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}${isToday ? ' today' : ''}`
                if (!list)
                  return (
                    <td key={i}>
                      <span className={cls}>
                        <span className="cal-num">{d}</span>
                      </span>
                    </td>
                  )
                return (
                  <td key={i}>
                    <button
                      type="button"
                      className={`${cls} called${selected === k ? ' selected' : ''}`}
                      aria-pressed={selected === k}
                      aria-label={`${mon + 1}月${d}日、電話${list.length}件${isToday ? '（今日）' : ''}`}
                      onClick={() => setSelected(k)}
                    >
                      <img className="cal-stamp" src={thumb(illustrationOf(list[0]))} alt="" />
                      <span className="cal-num">{d}</span>
                      {list.length > 1 && <span className="cal-count">{list.length}</span>}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cal-detail">
        {selDate && selList.length ? (
          <>
            <h3 className="cal-day-title">
              {selDate.getMonth() + 1}月{selDate.getDate()}日（{WD[selDate.getDay()]}）の電話
            </h3>
            {renderItems(selList)}
          </>
        ) : (
          <p className="note">絵の入った日が、電話をした日です。タップすると、その日の記録が見られます。</p>
        )}
      </div>
    </div>
  )
}
