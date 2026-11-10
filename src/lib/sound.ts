/**
 * サウンド管理
 *
 * - 環境音：public/audio/ambient/<key>.mp3 を「ストリーミング再生」する。
 *   15分以上の音源をそのまま使う前提のため、全体をデコードせず <audio> 要素から流す。
 *   ループ時は2本の要素でクロスフェードして継ぎ目を目立たせない。
 *   ファイルが無い／読み込めない場合は無音で進行する。
 * - 効果音（カード挿入・呼び出し音・終話音など）：Web Audio で合成。
 * - 音量は GainNode で制御（iOS Safari は audio.volume が効かないため）。
 */
import { AMBIENT_SOURCES, type AmbientKey } from './weather'
import type { Gender } from '../types'

const CROSSFADE_SEC = 6
const AMBIENT_LEVEL = 0.8
const DUCK_LEVEL = 0.3
const BASE = import.meta.env.BASE_URL

class Track {
  el: HTMLAudioElement
  gain: GainNode
  constructor(ctx: AudioContext, dest: AudioNode, src: string) {
    this.el = new Audio()
    this.el.crossOrigin = 'anonymous'
    this.el.preload = 'auto'
    this.el.src = src
    const node = ctx.createMediaElementSource(this.el)
    this.gain = ctx.createGain()
    this.gain.gain.value = 0
    node.connect(this.gain).connect(dest)
  }
  dispose() {
    this.el.pause()
    this.el.removeAttribute('src')
    this.el.load()
    this.gain.disconnect()
  }
}

class SoundManager {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private ambientBus!: GainNode
  private sfxBus!: GainNode
  private tracks: Track[] = []
  private active = 0
  private ambientKey: AmbientKey | null = null
  private ambientLevel = 1
  private fading = false
  private volume = 0.7
  private muted = false
  private loops = new Set<() => void>()
  ambientAvailable: boolean | null = null

  /** ユーザー操作の中で呼ぶ（自動再生制限の解除） */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.ambientBus = this.ctx.createGain()
      this.sfxBus = this.ctx.createGain()
      this.ambientBus.connect(this.master)
      this.sfxBus.connect(this.master)
      this.master.connect(this.ctx.destination)
      this.applyMaster()
      this.ambientBus.gain.value = AMBIENT_LEVEL
      this.sfxBus.gain.value = 0.5
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setVolume(v: number) {
    this.volume = v
    this.applyMaster()
  }
  setMuted(m: boolean) {
    this.muted = m
    this.applyMaster()
  }
  private applyMaster() {
    if (!this.ctx) return
    const target = this.muted ? 0 : this.volume
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15)
  }

  /** 通話中は環境音を控えめにする */
  duck(on: boolean) {
    if (!this.ctx) return
    this.ambientBus.gain.setTargetAtTime(on ? DUCK_LEVEL : AMBIENT_LEVEL, this.ctx.currentTime, 0.8)
  }

  playAmbient(key: AmbientKey | null) {
    if (!this.ctx || key === this.ambientKey) return
    this.stopAmbient()
    this.ambientKey = key
    if (!key) return
    const source = AMBIENT_SOURCES[key]
    this.ambientLevel = source.level
    const src = `${BASE}audio/ambient/${source.file}.mp3`
    const a = new Track(this.ctx, this.ambientBus, src)
    const b = new Track(this.ctx, this.ambientBus, src)
    b.el.preload = 'none'
    this.tracks = [a, b]
    this.active = 0
    this.fading = false
    const onError = () => {
      if (this.ambientKey !== key) return
      this.ambientAvailable = false
      this.stopAmbient()
    }
    a.el.addEventListener('error', onError, { once: true })
    for (const t of this.tracks) t.el.addEventListener('timeupdate', () => this.checkLoop(t))
    a.el
      .play()
      .then(() => {
        this.ambientAvailable = true
        this.fadeTo(a, this.ambientLevel, 3)
      })
      .catch(() => {
        /* 再生できない環境では無音で進行 */
      })
  }

  private checkLoop(t: Track) {
    if (!this.ctx || this.fading || this.tracks[this.active] !== t) return
    const d = t.el.duration
    if (!isFinite(d) || d < CROSSFADE_SEC * 3) return
    if (d - t.el.currentTime > CROSSFADE_SEC) return
    // 次のトラックへクロスフェード
    this.fading = true
    const next = this.tracks[1 - this.active]
    next.el.currentTime = 0
    void next.el.play().catch(() => {})
    this.fadeTo(next, this.ambientLevel, CROSSFADE_SEC)
    this.fadeTo(t, 0, CROSSFADE_SEC)
    this.active = 1 - this.active
    window.setTimeout(() => {
      t.el.pause()
      t.el.currentTime = 0
      this.fading = false
    }, CROSSFADE_SEC * 1000 + 200)
  }

  private fadeTo(t: Track, value: number, sec: number) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    t.gain.gain.cancelScheduledValues(now)
    t.gain.gain.setValueAtTime(t.gain.gain.value, now)
    t.gain.gain.linearRampToValueAtTime(value, now + sec)
  }

  stopAmbient() {
    const old = this.tracks
    this.tracks = []
    this.ambientKey = null
    for (const t of old) {
      this.fadeTo(t, 0, 1.5)
      window.setTimeout(() => t.dispose(), 1700)
    }
  }

  /** 最初の「もしもし？」だけ実際の声を使う。ファイルが無ければ字幕のみ。 */
  playVoice(gender: Gender): Promise<boolean> {
    if (!this.ctx) return Promise.resolve(false)
    // その他・回答しない：仕様上未確定。共通音声ファイルがあれば使い、無ければ字幕のみ。
    const file = gender === 'male' ? 'moshimoshi-male' : gender === 'female' ? 'moshimoshi-female' : 'moshimoshi-neutral'
    const t = new Track(this.ctx, this.sfxBus, `${BASE}audio/voice/${file}.mp3`)
    t.gain.gain.value = 2
    return new Promise((resolve) => {
      t.el.addEventListener('error', () => resolve(false), { once: true })
      t.el.addEventListener('ended', () => window.setTimeout(() => t.dispose(), 100), { once: true })
      t.el.play().then(
        () => resolve(true),
        () => resolve(false),
      )
    })
  }

  // ---- 効果音（合成） ----

  private tone(freq: number, start: number, dur: number, level = 0.25, type: OscillatorType = 'sine') {
    if (!this.ctx) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    const t0 = ctx.currentTime + start
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(level, t0 + 0.015)
    g.gain.setValueAtTime(level, t0 + dur - 0.03)
    g.gain.linearRampToValueAtTime(0, t0 + dur)
    o.connect(g).connect(this.sfxBus)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }

  click() {
    if (!this.ctx) return
    const ctx = this.ctx
    const len = Math.floor(ctx.sampleRate * 0.05)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4)
    const src = ctx.createBufferSource()
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 2200
    src.buffer = buf
    src.connect(f).connect(this.sfxBus)
    src.start()
  }

  /** カードが吸い込まれる音 */
  cardIn() {
    this.click()
    if (!this.ctx) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(90, ctx.currentTime)
    o.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.5)
    g.gain.setValueAtTime(0.04, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.55)
    o.connect(g).connect(this.sfxBus)
    o.start()
    o.stop(ctx.currentTime + 0.6)
  }

  /** 発信音（ツーーー）：stop 関数を返す */
  dialTone(): () => void {
    if (!this.ctx) return () => {}
    const ctx = this.ctx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 400
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05)
    o.connect(g).connect(this.sfxBus)
    o.start()
    const stop = () => {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.02)
      o.stop(ctx.currentTime + 0.2)
      this.loops.delete(stop)
    }
    this.loops.add(stop)
    return stop
  }

  /** プッシュボタンの音 */
  key(digit: number) {
    const low = [941, 697, 697, 697, 770, 770, 770, 852, 852, 852][digit] ?? 697
    const high = [1336, 1209, 1336, 1477, 1209, 1336, 1477, 1209, 1336, 1477][digit] ?? 1209
    this.tone(low, 0, 0.12, 0.08)
    this.tone(high, 0, 0.12, 0.08)
  }

  /** 呼び出し音（プルルル…）：1秒鳴って2秒休む × n回 */
  ring(times: number) {
    for (let i = 0; i < times; i++) {
      if (!this.ctx) return
      const ctx = this.ctx
      const t0 = ctx.currentTime + i * 3
      const o = ctx.createOscillator()
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      const g = ctx.createGain()
      o.frequency.value = 400
      lfo.frequency.value = 16
      lfoGain.gain.value = 0.05
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.02)
      g.gain.setValueAtTime(0.05, t0 + 0.98)
      g.gain.linearRampToValueAtTime(0, t0 + 1)
      lfo.connect(lfoGain).connect(g.gain)
      o.connect(g).connect(this.sfxBus)
      o.start(t0)
      lfo.start(t0)
      o.stop(t0 + 1.05)
      lfo.stop(t0 + 1.05)
    }
  }

  /** 残り度数わずかの警告音 */
  pip() {
    this.tone(1000, 0, 0.12, 0.12)
    this.tone(1000, 0.2, 0.12, 0.12)
  }

  /** 終話音（ツー、ツー、ツー） */
  busy() {
    for (let i = 0; i < 4; i++) this.tone(400, i * 1.0, 0.5, 0.08)
  }

  /** カード排出のお知らせ音（ピピピ） */
  eject() {
    for (let i = 0; i < 3; i++) this.tone(1200, i * 0.18, 0.1, 0.1, 'square')
  }

  stopLoops() {
    for (const s of [...this.loops]) s()
  }
}

export const sound = new SoundManager()
