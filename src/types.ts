export type Gender = 'male' | 'female' | 'other' | 'none'
export type LifeStage = 'student' | 'worker' | 'other' | 'none'
export type Dialect = 'standard' | 'kansai' | 'hakata'

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
  source?: 'jma' | 'open-meteo' | 'manual'
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
}
