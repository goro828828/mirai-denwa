/**
 * 47都道府県の「今の若い世代の、軽い方言」
 *
 * 方針
 * - 今の若い世代は、地域差の大部分が薄れ、多くが共通語形を使う［I］。
 *   そのため会話は「共通語を土台に、根拠のある特徴だけを少し混ぜる」形にする。
 * - 根拠が確認できた形だけを使う。確認できない県は共通語に寄せる（無理に方言を作らない）。
 * - 年配の世代が使う、古い・濃い方言（例：がばい、ばってん、〜まっし、〜ずら）は使わない。
 *   未来の自分も「今の若い世代が年をとった姿」なので、同じ軽い方言のまま話す。
 *
 * 出典（詳しくは DIALECTS.md）
 * ［L］伊豫田里沙（2019）「LINEスタンプの方言の語彙の特徴 ―13道府県のスタンプと公式性のあるスタンプにかんして―」
 *      『語文』165, 日本大学国文学会. 2019年7月取得のLINE方言スタンプ（各道府県上位20ユニット）の高頻度語。
 * ［G］全国方言文法データベース「原因・理由表現［分布］」（『方言文法全国地図』第33・35・37図にもとづく）。
 *      高年層の調査なので、地域ごとの大まかな傾向（西日本のケン類、中部のデ など）にだけ使う。
 * ［T］47都道府県方言百科辞典「【方言】47都道府県の『迚（とても）』の方言一覧」。年代の区別がないため、
 *      ［L］などで裏づけがとれる語、または広く知られた語だけ使う。
 * ［S］ソニー生命「47都道府県別 生活意識調査2022」（20〜59歳 各県100人）：宮崎県の「てげ」。
 * ［I］井上史雄・半沢康（2022）「方言の地域差から年齢差へ」『言語研究』162：
 *      20世紀末の中学生の全国調査で、地域差の大部分が薄れ、共通語形の回答が9割近く。
 *
 * 推定（※）：同じ地方の近い県の［L］と、［G］の地域分布から当てはめたもの。DIALECTS.md に県ごとに明記。
 */

export interface DialectProfile {
  /** 名詞＋「だよ」（文末） */
  dayo: string
  /** 名詞＋「だね」（文末） */
  dane: string
  /** 文頭の「だから」 */
  dakara: string
  /** 理由の「から」（動詞・形容詞のあと） */
  kara: string
  /** 確認の「でしょ」（文末） */
  desho: string
  /** 強調の「すごく」 */
  totemo: string
  /** 「いい」（形容詞） */
  ii: string
  /** 「〜てる」「〜てた」（て形のあと） */
  teru: string
  teta: string
  /** 形容詞・動詞のあとの「よ」「ね」 */
  yo: string
  ne: string
  /** 出典・根拠のメモ（画面には出さない） */
  basis: string
}

const STANDARD: DialectProfile = {
  dayo: 'だよ',
  dane: 'だね',
  dakara: 'だから',
  kara: 'から',
  desho: 'でしょ',
  totemo: 'すごく',
  ii: 'いい',
  teru: 'てる',
  teta: 'てた',
  yo: 'よ',
  ne: 'ね',
  basis: '共通語［I］',
}

const p = (over: Partial<DialectProfile>): DialectProfile => ({ ...STANDARD, ...over })

/** 東北：［L］宮城・山形の「だべ」 */
const TOHOKU = (basis: string) => p({ desho: 'だべ', basis })
/** 近畿：［L］大阪「めっちゃ」「へん」、1モーラ頻度で中部・関西の「や」 */
const KINKI = (basis: string, over: Partial<DialectProfile> = {}) =>
  p({ dayo: 'やで', dane: 'やな', dakara: 'やから', desho: 'やろ', totemo: 'めっちゃ', ii: 'ええ', yo: 'で', ne: 'な', basis, ...over })
/** 中国（山陽）：［L］広島「けん」「ぶち」「じゃ」、［G］西日本のケン類 */
const SANYO = (basis: string, over: Partial<DialectProfile> = {}) =>
  p({ dayo: 'じゃよ', dane: 'じゃね', dakara: 'じゃけん', kara: 'けん', desho: 'じゃろ', basis, ...over })
/** 山陰：［G］ケン類。断定は「だ」のまま */
const SANIN = (basis: string) => p({ dakara: 'だけん', kara: 'けん', basis })
/** 四国：［G］ケン類 */
const SHIKOKU = (basis: string, over: Partial<DialectProfile> = {}) =>
  p({ dayo: 'やよ', dane: 'やね', dakara: 'やけん', kara: 'けん', desho: 'やろ', basis, ...over })
/** 九州北部：［L］福岡・佐賀・長崎・熊本の「けん」「よか」「ばり」「と（っと）」 */
const KYUSHU_N = (basis: string, over: Partial<DialectProfile> = {}) =>
  p({ dayo: 'よ', dane: 'やね', dakara: 'やけん', kara: 'けん', desho: 'やろ', ii: 'よか', teru: 'とる', teta: 'とった', basis, ...over })

/** 都道府県コード → 方言プロフィール */
export const DIALECTS: Record<string, DialectProfile> = {
  '01': p({ desho: 'っしょ', totemo: 'なまら', basis: '［L］北海道：なまら31・っしょ27' }),
  '02': TOHOKU('※［L］宮城・山形の「だべ」を東北に適用'),
  '03': TOHOKU('※［L］宮城・山形の「だべ」を東北に適用'),
  '04': TOHOKU('［L］宮城：だべ25'),
  '05': TOHOKU('※［L］宮城・山形の「だべ」を東北に適用'),
  '06': TOHOKU('［L］山形：だべ22'),
  '07': TOHOKU('※［L］宮城・山形の「だべ」を東北に適用'),
  '08': p({ basis: '共通語［I］（若年層の根拠を確認できず）' }),
  '09': p({ basis: '共通語［I］（若年層の根拠を確認できず）' }),
  '10': p({ basis: '共通語［I］（若年層の根拠を確認できず）' }),
  '11': p({ basis: '共通語［I］' }),
  '12': p({ basis: '共通語［I］' }),
  '13': p({ basis: '共通語［I］' }),
  '14': p({ basis: '共通語［I］' }),
  '15': p({ basis: '共通語［I］（［G］のスケ類は高年層のため不採用）' }),
  '16': p({ basis: '共通語［I］（［G］のサカイ類は高年層のため不採用）' }),
  '17': p({ basis: '共通語［I］（［G］のサカイ類は高年層のため不採用）' }),
  '18': p({ basis: '共通語［I］（［G］のサカイ類は高年層のため不採用）' }),
  '19': p({ basis: '共通語［I］（［G］奈良田のデ・ニは高年層のため不採用）' }),
  '20': p({ basis: '共通語［I］（若年層の根拠を確認できず）' }),
  '21': p({ dayo: 'やよ', dane: 'やね', dakara: 'やで', kara: 'で', desho: 'やろ', basis: '※［G］岐阜市：デ。［L］中部・関西の「や」' }),
  '22': p({ desho: 'だら', totemo: 'ばか', basis: '［L］静岡：だら43・ばか32（強調）' }),
  '23': p({ dakara: 'だで', kara: 'で', totemo: 'でら', basis: '［L］愛知：でら47・だ/もんで14。［G］中部のデ' }),
  '24': KINKI('※［L］中部・関西の「や」。三重は近畿の形を控えめに', { yo: 'よ', ne: 'ね', ii: 'いい' }),
  '25': KINKI('※［L］大阪の形を近畿に適用'),
  '26': KINKI('※［L］大阪の形を近畿に適用'),
  '27': KINKI('［L］大阪：めっちゃ16・へん22・せや38'),
  '28': KINKI('※［L］大阪の形を近畿に適用。［T］兵庫：ばり', { totemo: 'ばり' }),
  '29': KINKI('※［L］大阪の形を近畿に適用'),
  '30': KINKI('※［L］大阪の形を近畿に適用'),
  '31': SANIN('※［G］ケン類（西日本）'),
  '32': SANIN('※［G］ケン類（西日本）'),
  '33': SANYO('※［L］広島の形を山陽に適用。［G］ケン類'),
  '34': SANYO('［L］広島：ぶち44・けん27・「じゃ」139（1モーラ頻度）', { totemo: 'ぶち' }),
  '35': SANYO('※［L］広島の形を山陽に適用。［T］山口：ぶち', { totemo: 'ぶち' }),
  '36': SHIKOKU('※［G］ケン類'),
  '37': SHIKOKU('※［G］ケン類'),
  '38': SHIKOKU('※［G］ケン類'),
  '39': SHIKOKU('※［G］ケン類のキニ（高知）', { dakara: 'やき', kara: 'き' }),
  '40': KYUSHU_N('［L］福岡：ばり49・けん20・よか59・っと', { totemo: 'ばり' }),
  '41': KYUSHU_N('［L］佐賀：ばり20・けん26・よか56', { totemo: 'ばり' }),
  '42': KYUSHU_N('［L］長崎：ばり16・けん26・よか55・っと10', { totemo: 'ばり' }),
  '43': KYUSHU_N('［L］熊本：よか63（強調語は若年層の根拠が弱いため「めっちゃ」）', { totemo: 'めっちゃ' }),
  '44': p({ dakara: 'やけん', kara: 'けん', basis: '※［G］ケン類（九州）' }),
  '45': p({ totemo: 'てげ', basis: '［S］宮崎：てげ。［L］鹿児島のスタンプにも てげ13。［G］宮崎はカラ類' }),
  '46': p({ totemo: 'わっぜ', ii: 'よか', basis: '［L］鹿児島：よか45・わっぜ14。［T］わっぜ' }),
  '47': p({ totemo: 'でーじ', dayo: 'さー', yo: 'さー', basis: '［L］沖縄：でーじ20・「さ」132（1モーラ頻度）' }),
}

export function dialectFor(prefCode: string): DialectProfile {
  return DIALECTS[prefCode] ?? STANDARD
}

/**
 * 台詞のテンプレートを、その県の話し方に置き換える。
 * テンプレートでは {だよ} {だね} {だから} {から} {でしょ} {すごく} {いい} {てる} {てた} {よ} {ね} を使う。
 */
export function renderDialect(text: string, d: DialectProfile): string {
  return text
    .replaceAll('{だよ}', d.dayo)
    .replaceAll('{だね}', d.dane)
    .replaceAll('{だから}', d.dakara)
    .replaceAll('{から}', d.kara)
    .replaceAll('{でしょ}', d.desho)
    .replaceAll('{すごく}', d.totemo)
    .replaceAll('{いい}', d.ii)
    .replaceAll('{てる}', d.teru)
    .replaceAll('{てた}', d.teta)
    .replaceAll('{よ}', d.yo)
    .replaceAll('{ね}', d.ne)
}
