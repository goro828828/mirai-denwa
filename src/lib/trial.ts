/**
 * 確認用：URL に ?first をつけて開くと、毎回「はじめて遊ぶ人」と同じ流れになる
 * （はじめの説明画面 → 初回だけの導入 → 通話 → 元の帰り道 → ホーム）。
 * ふだんの記録（通話履歴・登録内容・設定）には さわらず、別の保存場所（mirai-denwa-trial:）を使う。
 * 開くたびに、その確認用の保存場所を空にする。
 */
const has = (k: string) => {
  try {
    return new URLSearchParams(location.search).has(k)
  } catch {
    return false
  }
}

/**
 * 確認用：URL に ?capsule をつけて開くと、タイムカプセルを確かめられる
 * （毎回の電話でタイムカプセルをすすめられ、書いて送ると、次の電話を記録したあとホームに戻ったときに届く）。
 * ?first と同じ確認用の保存場所を使い、説明画面と初回の導入は飛ばす。
 */
export const CAPSULE_TEST = has('capsule')
/** 初回の流れの確認（?first） */
export const FIRST_TEST = has('first')
export const TRIAL = FIRST_TEST || CAPSULE_TEST

const PREFIX = 'mirai-denwa:'
const TRIAL_PREFIX = 'mirai-denwa-trial:'

/** 保存に使うキー（確認用のときは、別の場所） */
export const storeKey = (k: string) => (TRIAL ? k.replace(PREFIX, TRIAL_PREFIX) : k)

if (TRIAL) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(TRIAL_PREFIX)) localStorage.removeItem(k)
    if (CAPSULE_TEST) {
      localStorage.setItem(`${TRIAL_PREFIX}about-seen:v1`, '1')
      localStorage.setItem(`${TRIAL_PREFIX}prologue-seen:v1`, '1')
    }
  } catch {
    /* noop */
  }
}
