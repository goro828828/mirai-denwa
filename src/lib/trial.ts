/**
 * 確認用：URL に ?first をつけて開くと、毎回「はじめて遊ぶ人」と同じ流れになる
 * （はじめの説明画面 → 初回だけの導入 → 通話 → 元の帰り道 → ホーム）。
 * ふだんの記録（通話履歴・登録内容・設定）には さわらず、別の保存場所（mirai-denwa-trial:）を使う。
 * 開くたびに、その確認用の保存場所を空にする。
 */
export const TRIAL = (() => {
  try {
    return new URLSearchParams(location.search).has('first')
  } catch {
    return false
  }
})()

const PREFIX = 'mirai-denwa:'
const TRIAL_PREFIX = 'mirai-denwa-trial:'

/** 保存に使うキー（確認用のときは、別の場所） */
export const storeKey = (k: string) => (TRIAL ? k.replace(PREFIX, TRIAL_PREFIX) : k)

if (TRIAL) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(TRIAL_PREFIX)) localStorage.removeItem(k)
  } catch {
    /* noop */
  }
}
