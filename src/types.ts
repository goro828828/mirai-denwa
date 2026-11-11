export type Gender = 'male' | 'female' | 'other' | 'none'
export type LifeStage = 'student' | 'worker' | 'other' | 'none'

export interface Profile {
  nickname: string
  gender: Gender
  prefCode: string
  lifestage: LifeStage
}

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'thunder' | 'snow'

export interface WeatherInfo {
  kind: WeatherKind
  label: string
  isDay: boolean
  /** 代表地点名（例：東京都 → 新宿） */
  station: string
  fetchedAt: string
  /** 天気を取得できず、プレイヤーが自分で選んだ場合 true */
  manual?: boolean
  /** 取得元 */
  source?: 'jma' | 'open-meteo' | 'manual' | 'here'
}

export interface AnswerLog {
  key: string
  question: string
  answer: string
}

export interface CallRecord {
  id: string
  createdAt: string
  nickname: string
  gender: Gender
  lifestage: LifeStage
  prefCode: string
  prefName: string
  weather: WeatherInfo | null
  answers: AnswerLog[]
  finalMessage: string
  /** 使った度数（カードのパンチ穴に反映） */
  usedUnits: number
  /** 何年後の自分と話したか（古い履歴には無い → 10年後として扱う） */
  years?: number
  /** その回に出た話題（「最近の◯◯」枠） */
  topic?: string
}
