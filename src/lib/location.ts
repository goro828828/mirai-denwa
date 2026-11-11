/**
 * 現在地（任意）
 * 位置情報は、天気を取得するためだけに使う。端末にも履歴にも保存しない。
 * 外部（天気API）に送るときは、緯度・経度を 0.01 度（約1km）単位に丸める。
 */
export interface Coords {
  lat: number
  lon: number
}

export function canUseLocation(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

/** 現在地を取得する。許可されない・取れない・時間切れのときは null */
export function getPosition(timeoutMs = 10000): Promise<Coords | null> {
  if (!canUseLocation()) return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    const finish = (v: Coords | null) => {
      if (settled) return
      settled = true
      resolve(v)
    }
    // 許可のダイアログに答えないまま放置された場合も、先に進めるようにする
    const timer = window.setTimeout(() => finish(null), timeoutMs + 20000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer)
        finish({ lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) })
      },
      () => {
        window.clearTimeout(timer)
        finish(null)
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
    )
  })
}

const round = (v: number) => Math.round(v * 100) / 100
