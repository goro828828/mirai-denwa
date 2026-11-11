export type SlotState = 'empty' | 'inserting' | 'inside' | 'ejecting' | 'out'

interface Props {
  lifted: boolean
  lcd: string
  slot: SlotState
  activeKey?: number | null
  onHandset?: () => void
  handsetLabel?: string
  /** 押しボタンを押せるようにする（自分で年を押してかける回だけ） */
  onKey?: (n: number) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

/** 公衆電話（CSSで描画。特定の実在機種を模したものではない） */
export function Payphone({ lifted, lcd, slot, activeKey, onHandset, handsetLabel, onKey }: Props) {
  return (
    <div className="payphone" data-lifted={lifted} data-slot={slot}>
      <div className="pp-hood" aria-hidden="true" />
      <div className="pp-body">
        <button
          type="button"
          className="pp-handset"
          onClick={onHandset}
          disabled={!onHandset}
          aria-label={handsetLabel ?? '受話器'}
        >
          <span className="pp-handset-ear" />
          <span className="pp-handset-grip" />
          <span className="pp-handset-mouth" />
        </button>
        <span className="pp-cord" aria-hidden="true" />
        <div className="pp-panel">
          <div className="pp-lcd" role="status" aria-live="polite">
            {lcd}
          </div>
          <div className="pp-slot-area" aria-hidden="true">
            {/* 差し込み口の内側の「窓」。カードはこの中だけ見えるので、本体の中から出入りして見える */}
            <div className="pp-slot-window">
              <div className="pp-slot-card" />
            </div>
            <div className="pp-slot" />
            <span className="pp-slot-label">カード</span>
          </div>
          {onKey ? (
            <div className="pp-keys pressable" role="group" aria-label="押しボタン">
              {KEYS.map((k) => (
                <button
                  type="button"
                  key={k}
                  className={`pp-key${activeKey !== null && String(activeKey) === k ? ' on' : ''}`}
                  disabled={!/\d/.test(k)}
                  onClick={() => onKey(Number(k))}
                >
                  {k}
                </button>
              ))}
            </div>
          ) : (
            <div className="pp-keys" aria-hidden="true">
              {KEYS.map((k) => (
                <span key={k} className={`pp-key${activeKey !== null && String(activeKey) === k ? ' on' : ''}`}>
                  {k}
                </span>
              ))}
            </div>
          )}
          <div className="pp-return" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
