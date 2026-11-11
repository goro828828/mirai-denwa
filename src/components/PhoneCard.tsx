import type { CallRecord, Gender, LifeStage } from '../types'
import { findPref } from '../data/prefectures'
import { formatDateTime, weatherText } from '../lib/format'
import { TOTAL_UNITS } from '../lib/cardImage'
import { yearsLabel } from '../story/engine'
import { ILLUSTRATIONS, illustrationOf } from '../lib/illustrations'

export const GENDER_LABEL: Record<Gender, string> = { male: '男性', female: '女性', other: 'その他', none: '回答しない' }
export const LIFESTAGE_LABEL: Record<LifeStage, string> = { student: '学生', worker: '社会人', other: 'その他', none: '回答しない' }

export type FormField = 'nickname' | 'gender' | 'prefCode' | 'lifestage'

interface FormValues {
  nickname?: string
  gender?: Gender
  prefCode?: string
  lifestage?: LifeStage
}

function Holes({ used }: { used: number }) {
  const n = Math.round((Math.min(used, TOTAL_UNITS) / TOTAL_UNITS) * 10)
  return (
    <div className="pc-holes" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < n ? 'punched' : ''} />
      ))}
    </div>
  )
}

function Band() {
  return (
    <div className="pc-band" aria-hidden="true">
      <span className="pc-band-text">未来行きテレフォンカード</span>
      <span className="pc-band-unit">
        <b>{TOTAL_UNITS}</b>
        度数
      </span>
    </div>
  )
}

export function CardFront() {
  return (
    <div className="pc pc-front" role="img" aria-label="テレフォンカードの表面。「いつかのあなたへ、つながります。」と書かれている">
      <Band />
      <div className="pc-body">
        <svg className="pc-illust" viewBox="0 0 120 140" aria-hidden="true">
          <rect x="22" y="14" width="76" height="116" rx="12" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="34" y="26" width="52" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M14 40 q-6 30 0 60" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={44 + c * 16} cy={62 + r * 16} r="4" fill="currentColor" />),
          )}
          <rect x="70" y="112" width="20" height="4" rx="2" fill="currentColor" />
          <path d="M104 18 l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" fill="currentColor" opacity=".7" />
        </svg>
        <div className="pc-front-text">
          <p className="pc-small">TELEPHONE CARD</p>
          <p className="pc-front-title">いつかのあなたへ、つながります。</p>
          <p className="pc-small">このカードは、どこかの公衆電話で使えます。</p>
        </div>
      </div>
      <Holes used={0} />
    </div>
  )
}

interface FormProps {
  values: FormValues
  active?: FormField
  onSelect?: (f: FormField) => void
}

export function CardForm({ values, active, onSelect }: FormProps) {
  const pref = values.prefCode ? findPref(values.prefCode)?.name : undefined
  const rows: { key: FormField; label: string; value?: string }[] = [
    { key: 'nickname', label: 'おなまえ', value: values.nickname?.trim() || undefined },
    { key: 'gender', label: 'せいべつ', value: values.gender && GENDER_LABEL[values.gender] },
    { key: 'prefCode', label: 'すまい', value: pref },
    { key: 'lifestage', label: 'いまの自分', value: values.lifestage && LIFESTAGE_LABEL[values.lifestage] },
  ]
  return (
    <div className="pc pc-form">
      <Band />
      <div className="pc-body pc-form-body">
        <p className="pc-small">このカードに、あなたのことを書いてください。</p>
        <ul className="pc-fields">
          {rows.map((r) => (
            <li key={r.key}>
              {!onSelect ? (
                <div className="pc-field">
                  <span className="pc-field-label">{r.label}</span>
                  <span className={`pc-field-value${r.value ? ' filled' : ''}`}>{r.value ?? ''}</span>
                </div>
              ) : (
              <button
                type="button"
                className={`pc-field${active === r.key ? ' active' : ''}`}
                onClick={() => onSelect(r.key)}
                aria-label={`${r.label}：${r.value ?? '未記入'}（タップして書き直す）`}
              >
                <span className="pc-field-label">{r.label}</span>
                <span className={`pc-field-value${r.value ? ' filled' : ''}`}>{r.value ?? ''}</span>
              </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Holes used={0} />
    </div>
  )
}

interface PrintedProps {
  record: CallRecord
  /** メッセージを何文字まで印字したか（演出用）。undefined なら全部 */
  printedChars?: number
}

export function CardPrinted({ record, printedChars }: PrintedProps) {
  const msg = printedChars === undefined ? record.finalMessage : record.finalMessage.slice(0, printedChars)
  const pref = findPref(record.prefCode)?.name ?? record.prefName
  return (
    <div className="pc pc-printed">
      <Band />
      <div className="pc-body pc-printed-body">
        <span
          className="pc-illust-print"
          role="img"
          aria-label={`挿絵：${ILLUSTRATIONS[illustrationOf(record)].label}`}
          // 中身はアプリ内で定義した固定のSVGだけ（入力内容は含まない）
          dangerouslySetInnerHTML={{ __html: ILLUSTRATIONS[illustrationOf(record)].svg }}
        />
        <p className="pc-printed-title">未来の自分から、着信です。</p>
        <p className="pc-printed-date">{formatDateTime(record.createdAt)} 通話</p>
        <dl className="pc-printed-fields">
          <dt>なまえ</dt>
          <dd>{record.nickname}</dd>
          <dt>ばしょ</dt>
          <dd>{pref}</dd>
          <dt>てんき</dt>
          <dd>{weatherText(record.weather)}</dd>
        </dl>
        <p className="pc-printed-from">{yearsLabel(record.years ?? 10)}の {record.nickname} より</p>
        <p className="pc-printed-msg" aria-label={record.finalMessage}>
          <span aria-hidden="true">{msg}</span>
        </p>
      </div>
      <Holes used={record.usedUnits} />
    </div>
  )
}
