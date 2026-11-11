import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CallRecord, Profile, WeatherInfo, WeatherKind } from './types'
import { findPref } from './data/prefectures'
import { ambientFor, fetchWeather, fetchWeatherAt, isDaytime, timeOfDay } from './lib/weather'
import { getPosition } from './lib/location'
import { sound } from './lib/sound'
import { addHistory, clearHistory, deleteHistory, loadDraft, loadHistory, loadSettings, saveDraft, saveSettings, type Settings } from './lib/storage'
import { FillScene, PickupScene, TitleScene } from './scenes/Intro'
import { EjectScene, PhoneScene } from './scenes/Phone'
import { CallScene, type CallResult } from './scenes/Call'
import { HistoryScene, ResultScene } from './scenes/Outro'
import { LostScene, ReturnScene } from './scenes/Prologue'
import { SettingsDialog } from './components/Settings'
import { pickYearsFor, type PrevCall } from './story/engine'
import { pickIllustration } from './lib/illustrations'
import { seasonOf, type Season } from './components/TitleLandscape'
import type { TimeOfDay } from './lib/weather'

/**
 * タイトル画面の風景を、URL で指定して確かめる（例：?landscape=winter,night,snow）
 * 季節（spring/summer/autumn/winter）・時間帯（morning/day/evening/night）・天気（clear/cloudy/rain/thunder/snow）
 */
function landscapePreview(): { season?: Season; tod?: TimeOfDay; weather?: WeatherKind } {
  try {
    const v = new URLSearchParams(location.search).get('landscape')
    if (!v) return {}
    const [season, tod, weather] = v.split(',')
    return {
      season: (['spring', 'summer', 'autumn', 'winter'] as const).find((x) => x === season),
      tod: (['morning', 'day', 'evening', 'night'] as const).find((x) => x === tod),
      weather: (['clear', 'cloudy', 'rain', 'thunder', 'snow'] as const).find((x) => x === weather),
    }
  } catch {
    return {}
  }
}

type Scene = 'title' | 'pickup' | 'lost' | 'fill' | 'phone' | 'call' | 'eject' | 'return' | 'result' | 'history'

/** 初回だけの導入を見終わったか */
const PROLOGUE_KEY = 'mirai-denwa:prologue-seen:v1'
function prologueSeen(): boolean {
  try {
    return localStorage.getItem(PROLOGUE_KEY) === '1'
  } catch {
    return true
  }
}
function markPrologueSeen() {
  try {
    localStorage.setItem(PROLOGUE_KEY, '1')
  } catch {
    /* noop */
  }
}

/** 4項目すべて記入済みなら、登録内容として使う */
function completeProfile(p: Partial<Profile>): Profile | null {
  return p.nickname && p.gender && p.prefCode && p.lifestage ? (p as Profile) : null
}

/** 前回の通話の要約（2回目以降の会話で触れる） */
function prevFrom(r: CallRecord | undefined): PrevCall | undefined {
  if (!r) return undefined
  const text = r.answers.find((a) => a.key === 'topicText')?.answer
  return {
    hoursAgo: (Date.now() - new Date(r.createdAt).getTime()) / 36e5,
    topic: r.topic,
    topicText: text && text !== '（書かなかった）' ? text : undefined,
  }
}

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
  /** 今回が何回目の通話か、前回の通話の要約 */
  const [callIndex, setCallIndex] = useState(1)
  const [prev, setPrev] = useState<PrevCall | undefined>(undefined)
  /** 登録内容（2回目以降は、いちいち書き直さずに使う） */
  const [saved, setSaved] = useState<Profile | null>(() => completeProfile(loadDraft<Profile>()))
  /** 記入画面を「登録内容の変更だけ」で開いたとき true */
  const [editOnly, setEditOnly] = useState(false)
  const [notice, setNotice] = useState('')
  /** 初回だけの導入の最中か（通話履歴がなく、まだ導入を見ていないとき） */
  const [prologue, setPrologue] = useState(false)
  const [history, setHistory] = useState<CallRecord[]>(() => loadHistory())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  /** タイトル画面の風景に使う天気（登録した都道府県、または許可済みなら現在地） */
  const [titleWeather, setTitleWeather] = useState<WeatherKind | null>(null)
  const titleWeatherAt = useRef(0)
  const weatherFor = useRef<string | null>(null)
  /** 現在地の天気（取れたら、都道府県の天気より優先する） */
  const hereWeather = useRef<WeatherInfo | null>(null)
  const historyBack = useRef<Scene>('title')
  const mainRef = useRef<HTMLElement>(null)

  const prefersReduced = usePrefersReducedMotion()
  const reduced = settings.reduceMotion ?? prefersReduced

  useEffect(() => {
    sound.setVolume(settings.volume)
    sound.setMuted(settings.muted)
    sound.setMusicEnabled(settings.music)
    saveSettings(settings)
  }, [settings])

  // BGM：タイトル画面と、通話のあとカードに文字が刻まれる場面（カードを受け取る画面まで）で流す
  useEffect(() => {
    sound.setMusicScene(scene === 'title' || scene === 'eject' || scene === 'return' || scene === 'result')
  }, [scene])

  // ブラウザは、画面に触れるまで音を出せない。最初に触れたときに音を準備する（タイトル画面の BGM もここから始まる）
  useEffect(() => {
    if (sound.unlocked) return
    const first = () => {
      sound.unlock()
      window.removeEventListener('pointerdown', first)
      window.removeEventListener('keydown', first)
    }
    window.addEventListener('pointerdown', first)
    window.addEventListener('keydown', first)
    return () => {
      window.removeEventListener('pointerdown', first)
      window.removeEventListener('keydown', first)
    }
  }, [])

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
    if (hereWeather.current) return setWeather(hereWeather.current)
    void fetchWeather(pref).then((w) => {
      if (weatherFor.current === code && !hereWeather.current) setWeather(w)
    })
  }, [])

  // 天気が決まったら環境音を流す（取得できなければ無音）
  useEffect(() => {
    // 初回の導入：いつもの帰り道（拾う場面・戻ってきた場面）は、カフェのそばの音
    if (prologue && (scene === 'pickup' || scene === 'return' || scene === 'result')) return sound.playAmbient('cafe')
    // 畦道に立ってからは、天気に合わせた音（初回は記入中も流す）
    const quiet = scene === 'title' || scene === 'pickup' || (scene === 'fill' && !prologue)
    if (quiet) return
    // 天気がまだわからない（位置情報なし・県もまだ）ときは、帰り道の音だけ止めて、天気がわかるまで待つ（推測はしない）
    if (weather === undefined) return void (prologue && sound.stopAmbient())
    sound.playAmbient(ambientFor(weather))
  }, [weather, scene, prologue])

  const start = () => {
    sound.unlock()
    sound.click()
    setRecord(null)
    // 1〜3回目は10年後。4回目以降は10〜60年後、履歴が10件たまるごとに次の1回は10年前か100年後（自動で抽選）
    setYears(pickYearsFor(history.length))
    setCallIndex(history.length + 1)
    setPrev(prevFrom(history[0]))
    setNotice('')
    setPrologue(history.length === 0 && !prologueSeen())
    setScene('pickup')
    // 天気は通話のたびに取り直す（前回の天気を使い回さない）
    weatherFor.current = null
    setWeather(undefined)
    // 現在地の天気（任意）。許可されなければ、入力した都道府県の天気を使う
    hereWeather.current = null
    if (settings.useLocation) {
      void getPosition().then(async (pos) => {
        if (!pos) return
        const w = await fetchWeatherAt(pos.lat, pos.lon)
        if (!w) return
        hereWeather.current = w
        setWeather(w)
      })
    }
  }

  const onFilled = (p: Profile) => {
    saveDraft(p)
    setSaved(p)
    if (editOnly) {
      // 登録内容の変更だけ：タイトルへ戻る
      setEditOnly(false)
      setNotice('登録内容を変更しました。')
      setScene('title')
      return
    }
    setProfile(p)
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
      rec.illustration = pickIllustration(rec)
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
    setPrologue(false)
    sound.stopAmbient()
    setScene('title')
  }

  // タイトル画面の天気：位置情報がすでに許可されていれば現在地、なければ登録した都道府県（10分ごとに取り直す）
  useEffect(() => {
    if (scene !== 'title' || Date.now() - titleWeatherAt.current < 10 * 60 * 1000) return
    titleWeatherAt.current = Date.now()
    let alive = true
    void (async () => {
      let w: WeatherInfo | null = null
      if (settings.useLocation && navigator.permissions) {
        const st = await navigator.permissions.query({ name: 'geolocation' }).catch(() => null)
        if (st?.state === 'granted') {
          const pos = await getPosition()
          if (pos) w = await fetchWeatherAt(pos.lat, pos.lon)
        }
      }
      const pref = saved ? findPref(saved.prefCode) : undefined
      if (!w && pref) w = await fetchWeather(pref)
      if (alive && w) setTitleWeather(w.kind)
    })()
    return () => {
      alive = false
    }
  }, [scene, saved, settings.useLocation])

  const tod = useMemo(() => timeOfDay(), [scene])
  const preview = useMemo(landscapePreview, [])
  const landscape = {
    tod: preview.tod ?? tod,
    weather: preview.weather ?? titleWeather,
    season: preview.season ?? seasonOf(),
  }
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
        <button
          type="button"
          className={`icon-btn${settings.music ? '' : ' off'}`}
          aria-label="BGM"
          aria-pressed={settings.music}
          title={settings.music ? 'BGMを止める' : 'BGMを流す'}
          onClick={() => {
            sound.unlock()
            setSettings((s) => ({ ...s, music: !s.music }))
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 18V6l10-2v12" />
            <circle cx="6.5" cy="18" r="2.5" />
            <circle cx="16.5" cy="16" r="2.5" />
            {!settings.music && <path d="M4 4l16 16" />}
          </svg>
        </button>
        <button type="button" className="icon-btn" aria-label="設定" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
        </button>
      </div>

      <main ref={mainRef} tabIndex={-1} className="main">
        {scene === 'title' && (
          <>
            {notice && (
              <p className="toast notice" role="status">
                {notice}
              </p>
            )}
            <TitleScene
              onStart={start}
              onHistory={() => openHistory('title')}
              historyCount={history.length}
              saved={saved}
              landscape={landscape}
              onEditProfile={() => {
                setNotice('')
                setEditOnly(true)
                setScene('fill')
              }}
            />
          </>
        )}
        {scene === 'pickup' && (
          <PickupScene
            reduced={reduced}
            saved={saved}
            onDone={() => setScene('fill')}
            onWarp={prologue ? () => setScene('lost') : undefined}
            onUse={() => saved && onFilled(saved)}
            onEdit={() => setScene('fill')}
          />
        )}
        {scene === 'lost' && <LostScene landscape={{ ...landscape, weather: weather?.kind ?? landscape.weather }} reduced={reduced} onDone={() => setScene('fill')} />}
        {scene === 'fill' && (
          <FillScene
            lead={prologue && !editOnly ? '電話の台でカードを裏返すと、名前を書く欄があった。' : undefined} initial={saved ?? loadDraft<Profile>()} onPrefChange={requestWeather} onDone={onFilled} submitLabel={editOnly ? '保存する' : prologue ? 'このカードで電話をかける' : undefined} />
        )}
        {scene === 'phone' && profile && <PhoneScene profile={profile} weather={weather} years={years} onConnected={() => setScene('call')} onManualWeather={chooseSky} />}
        {scene === 'call' && profile && <CallScene profile={profile} weather={weather ?? null} years={years} callIndex={callIndex} prev={prev} reduced={reduced} onEnd={onCallEnd} />}
        {scene === 'eject' && record && (
          <EjectScene
            record={record}
            reduced={reduced}
            onDone={() => {
              if (!prologue) return setScene('result')
              markPrologueSeen()
              setScene('return')
            }}
          />
        )}
        {scene === 'return' && <ReturnScene reduced={reduced} onDone={() => setScene('result')} />}
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
