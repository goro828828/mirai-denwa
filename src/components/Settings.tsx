import { useEffect, useRef } from 'react'
import type { Settings } from '../lib/storage'
import { AMBIENT_CREDITS } from '../lib/credits'

export function SettingsDialog({
  open,
  settings,
  ambientAvailable,
  onChange,
  onClose,
}: {
  open: boolean
  settings: Settings
  ambientAvailable: boolean | null
  onChange: (s: Settings) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const motionValue = settings.reduceMotion === null ? 'auto' : settings.reduceMotion ? 'on' : 'off'

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="settings-title" onClose={onClose} onCancel={onClose}>
      <h2 id="settings-title">設定</h2>

      <div className="setting">
        <label htmlFor="vol">音量</label>
        <input
          id="vol"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(e) => onChange({ ...settings, volume: Number(e.target.value), muted: false })}
        />
      </div>

      <div className="setting row">
        <span id="mute-label">音を消す</span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.muted}
          aria-labelledby="mute-label"
          className={`switch${settings.muted ? ' on' : ''}`}
          onClick={() => onChange({ ...settings, muted: !settings.muted })}
        >
          <span />
        </button>
      </div>

      <div className="setting row">
        <span id="loc-label">
          現在地の天気を使う
          <small className="setting-help">位置情報は天気にだけ使い、保存しません</small>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.useLocation}
          aria-labelledby="loc-label"
          className={`switch${settings.useLocation ? ' on' : ''}`}
          onClick={() => onChange({ ...settings, useLocation: !settings.useLocation })}
        >
          <span />
        </button>
      </div>

      <fieldset className="setting">
        <legend>アニメーション</legend>
        {(
          [
            ['auto', '端末の設定に合わせる'],
            ['on', '減らす'],
            ['off', '減らさない'],
          ] as const
        ).map(([v, label]) => (
          <label key={v} className="radio">
            <input
              type="radio"
              name="motion"
              value={v}
              checked={motionValue === v}
              onChange={() => onChange({ ...settings, reduceMotion: v === 'auto' ? null : v === 'on' })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {ambientAvailable === false && <p className="note left">この天気の環境音は、いま用意されていません。字幕と効果音で進みます。</p>}

      <details className="credits">
        <summary>クレジット（環境音・天気）</summary>
        <ul>
          {AMBIENT_CREDITS.map((c) => (
            <li key={c.use}>
              <b>{c.use}</b>
              <span>
                「{c.title}」 {c.author}
              </span>
              <span>
                <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {c.license}
                </a>
                ・
                <a href={c.source} target="_blank" rel="noopener noreferrer">
                  出典
                </a>
              </span>
              <span className="credit-note">{c.note}</span>
            </li>
          ))}
        </ul>
        <p className="credit-note">
          天気：出典{' '}
          <a href="https://www.jma.go.jp/" target="_blank" rel="noopener noreferrer">
            気象庁ホームページ
          </a>
          （取得できないときは Open-Meteo）
        </p>
      </details>

      <button type="button" className="btn primary" onClick={onClose}>
        とじる
      </button>
    </dialog>
  )
}
