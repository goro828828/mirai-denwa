import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CallRecord, Profile, WeatherInfo, WeatherKind } from './types'
import { findPref } from './data/prefectures'
import { ambientFor, fetchWeather, isDaytime, timeOfDay } from './lib/weather'
import { sound } from './lib/sound'
import { addHistory, clearHistory, deleteHistory, loadDraft, loadHistory, loadSettings, saveDraft, saveSettings, type Settings } from './lib/storage'
import { FillScene, PickupScene, TitleScene } from './scenes/Intro'
import { EjectScene, PhoneScene } from './scenes/Phone'
import { CallScene, type CallResult } from './scenes/Call'
import { HistoryScene, ResultScene } from './scenes/Outro'
import { SettingsDialog } from './components/Settings'
import { pickYears } from './story/engine'

type Scene = 'title' | 'pickup' | 'fill' | 'phone' | 'call' | 'eject' | 'result' | 'history'

function usePrefersReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)'
  const [v, setV] = useState(() => window.matchMedia?.(q).matches ?? false)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return
    const h = () => setV(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return v
}

export default function App() {
  const [scene, setScene] = useState<Scene>('title')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [weather, setWeather] = useState<WeatherInfo | null | undefined>(undefined)
  const [record, setRecord] = useState<CallRecord | null>(null)
  /** 今回つながる「何年後の自分」。カードを拾うたびにランダムで決める */
  const [years, setYears] = useState(10)
  const [history, setHistory] = useState<CallRecord[]>(() => loadHistory())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const weatherFor = useRef<string | null>(null)
  const historyBack = useRef<Scene>('title')
  const mainRef = useRef<HTMLElement>(null)

  const prefersReduced = usePrefersReducedMotion()
  const reduced = settings.reduceMotion ?? prefersReduced

  useEffect(() => {
    sound.setVolume(settings.volume)
    sound.setMuted(settings.muted)
    saveSettings(settings)
  }, [settings])

  // 場面が変わったら先頭へ（スクリーンリーダーにも場面転換を伝える）
  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [scene])

  const requestWeather = useCallback((code: string) => {
    if (weatherFor.current === code) return
    weatherFor.current = code
    setWeather(undefined)
    const pref = findPref(code)
    if (!pref) return setWeather(null)
    void fetchWeather(pref).then((w) => {
      if (weatherFor.current === code) setWeather(w)
    })
  }, [])

  // 天気が決まったら環境音を流す（取得できなければ無音）
  useEffect(() => {
    if (scene === 'title' || scene === 'pickup' || scene === 'fill' || weather === undefined) return
    sound.playAmbient(ambientFor(weather))
  }, [weather, scene])

  const start = () => {
    sound.unlock()
    sound.click()
    setRecord(null)
    setYears(pickYears())
    setScene('pickup')
  }

  const onFilled = (p: Profile) => {
    setProfile(p)
    saveDraft(p)
    requestWeather(p.prefCode)
    setScene('phone')
  }

  const onCallEnd = useCallback(
    (r: CallResult) => {
      if (!profile) return
      const rec: CallRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        nickname: profile.nickname,
        gender: profile.gender,
        lifestage: profile.lifestage,
        prefCode: profile.prefCode,
        prefName: findPref(profile.prefCode)?.name ?? '',
        weather: weather ?? null,
        answers: r.answers,
        finalMessage: r.finalMessage,
        usedUnits: r.usedUnits,
        years,
        topic: r.topic,
      }
      setSaveFailed(!addHistory(rec))
      setHistory(loadHistory())
      setRecord(rec)
      setScene('eject')
    },
    [profile, weather, years],
  )

  const chooseSky = (kind: WeatherKind) => {
    sound.unlock()
    const pref = profile ? findPref(profile.prefCode) : undefined
    const h = new Date().getHours()
    const isDay = pref ? isDaytime(pref.lat, pref.lon) : h >= 6 && h < 18
    const label = { clear: '晴れ', cloudy: 'くもり', rain: '雨', thunder: '雷雨', snow: '雪' }[kind]
    setWeather({ kind, label, isDay, station: '自分で選択', fetchedAt: new Date().toISOString(), manual: true, source: 'manual' })
  }

  const openHistory = (from: Scene) => {
    sound.unlock()
    historyBack.current = from
    setScene('history')
  }

  const toTitle = () => {
    sound.stopAmbient()
    setScene('title')
  }

  const tod = useMemo(() => timeOfDay(), [scene])
  const sky = weather?.kind ?? 'none'

  return (
    <div className={`app tod-${tod} sky-${sky}${reduced ? ' reduce-motion' : ''}`}>
      <div className="backdrop" aria-hidden="true">
        {(sky === 'rain' || sky === 'thunder') && scene !== 'title' && <div className="rainfall" />}
      </div>

      <div className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label={settings.muted ? '音を出す' : '音を消す'}
          aria-pressed={settings.muted}
          onClick={() => {
            sound.unlock()
            setSettings((s) => ({ ...s, muted: !s.muted }))
          }}
        >
          {settings.muted ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" /></svg>
          )}
        </button>
        <button type="button" className="icon-btn" aria-label="設定" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
        </button>
      </div>

      <main ref={mainRef} tabIndex={-1} className="main">
        {scene === 'title' && <TitleScene onStart={start} onHistory={() => openHistory('title')} historyCount={history.length} />}
        {scene === 'pickup' && <PickupScene reduced={reduced} onDone={() => setScene('fill')} />}
        {scene === 'fill' && <FillScene initial={loadDraft<Profile>()} onPrefChange={requestWeather} onDone={onFilled} />}
        {scene === 'phone' && profile && <PhoneScene profile={profile} weather={weather} years={years} onConnected={() => setScene('call')} onManualWeather={chooseSky} />}
        {scene === 'call' && profile && <CallScene profile={profile} weather={weather ?? null} years={years} reduced={reduced} onEnd={onCallEnd} />}
        {scene === 'eject' && record && <EjectScene record={record} reduced={reduced} onDone={() => setScene('result')} />}
        {scene === 'result' && record && (
          <>
            {saveFailed && <p className="toast">この端末では履歴を保存できませんでした。カードは画像で保存できます。</p>}
            <ResultScene record={record} onHistory={() => openHistory('result')} onAgain={toTitle} />
          </>
        )}
        {scene === 'history' && (
          <HistoryScene
            records={history}
            onDelete={(id) => {
              deleteHistory(id)
              setHistory(loadHistory())
            }}
            onClear={() => {
              clearHistory()
              setHistory([])
            }}
            onBack={() => (historyBack.current === 'result' && record ? setScene('result') : toTitle())}
          />
        )}
      </main>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        ambientAvailable={sound.ambientAvailable}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
