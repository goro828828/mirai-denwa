/**
 * 名前の欄に書かれた言葉で起きる、特別なイベント
 *
 * - bureau（時間管理局）：差別語・暴言・下ネタを含む名前 → 1000年後の時間管理局につながり、記憶を消されて名前の記入に戻る
 * - inmu：特定のネットの語録を含む名前 → 1145年14月19日につながり、歌い出して通話履歴がすべて消える
 *
 * 判定は「ひらがな・小文字・記号なし」にそろえてから、部分一致で行う。
 * ふつうの名前に含まれやすい短い言葉は、名前全体が一致したときだけにする（例：ばか、ほも）。
 */

export type NameEvent = 'bureau' | 'inmu'

/** 全角半角・大文字小文字・カタカナをそろえ、空白と記号を取り、同じ文字の連続（数字以外）を1つにする */
export function normalizeName(s: string): string {
  const base = s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\p{P}\p{S}]/gu, '')
  return base.replace(/(\D)\1+/g, '$1').replace(/ー+/g, 'ー')
}

/** 英字の言い換え（0→o など）。英語の暴言の判定だけに使う */
const leet = (s: string) => s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')

// ---- 時間管理局（差別語・暴言・下ネタ） ----
const BUREAU_ANY = [
  // 英語
  'nigger', 'nigga', 'faggot', 'retard', 'cunt', 'fuck', 'fuk', 'shit', 'bitch', 'whore', 'slut', 'penis', 'vagina',
  'pussy', 'porn', 'sex', 'boob', 'asshole', 'bastard', 'rape', 'dildo', 'blowjob', 'nazi', 'hitler',
  // 日本語：暴言・差別語
  'しね', '死ね', '氏ね', '市ね', 'ころす', '殺す', 'ころして', '殺して', 'きちがい', '基地外', '気違い', 'きちげ', 'がいじ', '池沼', '知恵遅れ', 'ちえおくれ',
  'かたわ', 'めくら', 'つんぼ', 'びっこ', 'ちゃんころ', 'くろんぼ', '黒んぼ', 'にがー', '支那人', 'しなじん', '部落民', 'ぶらくみん',
  'くそ', '糞', 'くたばれ', '消えろ', 'きえろ', 'うざい', 'きもい', 'キモい',
  // 日本語：下ネタ
  'うんこ', 'うんち', 'ちんこ', 'ちんぽ', 'ちんちん', 'ちんげ', 'まんこ', 'おまんこ', 'まんまん', 'おっぱい', 'ぱいおつ', 'せっくす', 'えっち', 'えろい', 'えろ本', 'えろ動画',
  'おなにー', 'おなに', 'ふぇら', 'くんに', '射精', 'しゃせー', '精液', 'せいえき', '勃起', 'ぼっき', '童貞', 'どうてい', '処女', '売春', 'ばいしゅん',
  '援交', 'えんこう', '強姦', 'ごうかん', 'れいぷ', '痴漢', 'ちかん', '変態', 'へんたい', 'ぱんつ', 'ぱんてぃ', 'きんたま', '金玉', '乳首', 'ちくび',
  '陰毛', 'いんもう', '性器', '肉便器', 'あなる', 'ぶっかけ', '中出し', 'なかだし', '手マン', 'てまん', 'ちんかす', 'まんかす', 'やりまん', 'やりちん',
]
/** 名前全体が一致したときだけ（短くて、ふつうの名前にまぎれやすいもの） */
const BUREAU_EXACT = [
  'fag', 'cum', 'えろ', 'dick', 'cock', 'tits', 'ass', 'kys', 'ばか', '馬鹿', 'あほ', '阿呆', 'かす', 'くず', 'ぶす', 'でぶ', 'はげ', 'のろま', 'ほも', 'れず', 'おかま', 'ちょん',
  'しな', '支那', 'ちん', 'まん', 'ぱい', 'しゃせい', '精子', 'せいし', 'にが', 'うざ', 'きも',
]

// ---- 1145年14月19日（特定の語録） ----
const INMU_ANY = [
  '野獣先輩', 'やじゅうせんぱい', '野獣', 'やじゅう', '淫夢', 'いんむ', 'inmu', '114514', '1919810', '364364', '810',
  'いいよこいよ', 'やりますねぇ', 'やりますねえ', 'あくしろよ', 'まずうちさぁ', '屋上あんだけど', 'おくじょうあんだけど', '焼いてかない', 'やいてかない',
  'あいすてぃーしかなかった', '暴れんなよ', 'あばれんなよ', '頭にきますよ', 'あたまにきますよ', '見とけよ見とけよ', 'みとけよみとけよ', 'んあっー', 'んあっ',
  'いきすぎぃ', 'いきすぎいい', '王道を征く', '24歳学生', '24さい学生', '24歳がくせい', '迫真空手部', '迫真', 'ぬわーん', '疲れたもーん', 'つかれたもーん',
  'いいゾ〜これ', 'いいぞこれ', 'こいよおら', 'ほらほらほら',
]
const INMU_EXACT = ['ふぁっ', 'ふぁ', 'kmr', 'mur', 'tdn', '先輩', 'せんぱい']

const prep = (list: string[]) => list.map(normalizeName).filter(Boolean)
const B_ANY = prep(BUREAU_ANY)
const B_EXACT = new Set(prep(BUREAU_EXACT))
const I_ANY = prep(INMU_ANY)
const I_EXACT = new Set(prep(INMU_EXACT))

/** 名前で起きるイベント（なければ null）。両方にあたるときは inmu を優先する */
export function nameEventOf(name: string): NameEvent | null {
  const n = normalizeName(name)
  if (!n) return null
  if (I_EXACT.has(n) || I_ANY.some((w) => n.includes(w))) return 'inmu'
  const l = leet(n)
  if (B_EXACT.has(n) || B_EXACT.has(l) || B_ANY.some((w) => n.includes(w) || l.includes(w))) return 'bureau'
  return null
}
