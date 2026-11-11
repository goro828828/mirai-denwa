"""
タイトル画面とカード印字の場面に流す BGM「遠い放課後」（このゲームのためのオリジナル曲）

この楽譜から MIDI を作り、FluidSynth と FluidR3_GM サウンドフォント（MIT ライセンス）で音にする。
  python3 tools/bgm/compose.py out.mid
  fluidsynth -ni -F out.wav -r 44100 /usr/share/sounds/sf2/FluidR3_GM.sf2 out.mid
仕上げ（テープのような柔らかさ・ループ用の処理）は render.sh を参照。

ヘ長調・♩=70。ピアノの分散和音、オルゴールの旋律、うしろに薄い弦。
構成：前奏(4) → A(8) → A'(8, 弦が入る) → B(8) → A''(8, 旋律はピアノ) → 後奏(4)
"""
import random
import sys

import mido

BPM = 70
TPB = 480
random.seed(7)

# 和音：根音（MIDI）と、根音からの音程
MAJ7 = [0, 4, 7, 11]
MIN7 = [0, 3, 7, 10]
DOM7 = [0, 4, 7, 10]
SUS4 = [0, 5, 7, 10]
ADD9 = [0, 4, 7, 14]

F, G, A, Bb, C, D, E = 41, 43, 45, 46, 48, 50, 40

def ch(root, q):
    return (root, q)

INTRO = [ch(F, MAJ7), ch(Bb, MAJ7), ch(F, ADD9), ch(C, SUS4)]
A_CH = [ch(F, MAJ7), ch(E, MIN7), ch(D, MIN7), ch(G, MIN7), ch(Bb, MAJ7), ch(A, MIN7), ch(G, MIN7), ch(C, SUS4)]
A_END = [ch(F, MAJ7), ch(E, MIN7), ch(D, MIN7), ch(G, MIN7), ch(Bb, MAJ7), ch(A, MIN7), ch(G, MIN7), ch(C, DOM7)]
B_CH = [ch(Bb, MAJ7), ch(C, DOM7), ch(A, MIN7), ch(D, MIN7), ch(G, MIN7), ch(C, DOM7), ch(A, MIN7), ch(Bb, MAJ7)]
OUTRO = [ch(Bb, MAJ7), ch(C, SUS4), ch(F, ADD9), ch(F, ADD9)]

# 旋律：(音高 or None, 拍数) を小節ごとに
R = None
A_MEL = [
    [(69, 1.5), (67, 0.5), (69, 1), (72, 1)],
    [(76, 2), (74, 1), (72, 1)],
    [(74, 1.5), (72, 0.5), (69, 2)],
    [(67, 1), (69, 1), (70, 1), (72, 1)],
    [(74, 1.5), (72, 0.5), (74, 1), (77, 1)],
    [(76, 3), (72, 1)],
    [(74, 1), (72, 1), (70, 1), (69, 1)],
    [(67, 3), (R, 1)],
]
A2_MEL = A_MEL[:6] + [
    [(70, 1), (69, 1), (67, 1), (64, 1)],
    [(65, 3), (R, 1)],
]
B_MEL = [
    [(77, 1.5), (76, 0.5), (74, 1), (72, 1)],
    [(76, 1.5), (74, 0.5), (72, 2)],
    [(72, 1), (69, 1), (76, 1), (79, 1)],
    [(77, 3), (69, 1)],
    [(70, 1.5), (69, 0.5), (70, 1), (74, 1)],
    [(72, 1), (70, 1), (67, 1), (76, 1)],
    [(72, 1.5), (74, 0.5), (76, 2)],
    [(74, 2), (72, 2)],
]

SECTIONS = [
    # (和音, 旋律, 旋律の楽器, 弦あり)
    (INTRO, None, None, False),
    (A_CH, A_MEL, 'box', False),
    (A_END, A2_MEL, 'box', True),
    (B_CH, B_MEL, 'box', True),
    (A_END, A2_MEL, 'piano', True),
    (OUTRO, None, None, False),
]

# チャンネル：0=ピアノ 1=オルゴール 2=弦
PROGRAMS = {0: 0, 1: 10, 2: 49}

events = []  # (tick, msg)

def note(chan, pitch, start_beat, beats, vel):
    s = int(start_beat * TPB)
    e = int((start_beat + beats) * TPB)
    # ほんの少し揺らす（人が弾いたように）
    s += random.randint(0, 18)
    events.append((s, mido.Message('note_on', channel=chan, note=pitch, velocity=max(1, min(127, vel)))))
    events.append((e, mido.Message('note_off', channel=chan, note=pitch, velocity=0)))

def cc(chan, num, val, beat):
    events.append((int(beat * TPB), mido.Message('control_change', channel=chan, control=num, value=val)))

beat = 0.0
for chords, mel, mel_inst, strings in SECTIONS:
    for i, (root, q) in enumerate(chords):
        bar = beat + i * 4
        # ペダル（小節ごとに踏みかえ）
        cc(0, 64, 0, bar)
        cc(0, 64, 100, bar + 0.05)
        # 左手：根音と5度
        note(0, root, bar, 4, 48)
        note(0, root + 7 + 12 if root < 44 else root + 7, bar + 2, 2, 36)
        # 右手：8分の分散和音
        tones = sorted({root + 12 + iv for iv in q} | {root + 24 + q[1]})
        pattern = [0, 1, 2, 3, 4 if len(tones) > 4 else 3, 3, 2, 1]
        for k, idx in enumerate(pattern):
            p = tones[min(idx, len(tones) - 1)]
            vel = 40 if k % 2 == 0 else 32
            if mel is None and k == 0:
                vel = 46
            note(0, p, bar + k * 0.5, 0.9, vel + random.randint(-3, 3))
        # 弦：和音をのばす
        if strings:
            for iv in q[:3]:
                note(2, root + 12 + iv, bar, 4, 30)
        # 旋律
        if mel is not None:
            t = bar
            for pitch, d in mel[i]:
                if pitch is not None:
                    if mel_inst == 'box':
                        note(1, pitch + 12, t, d, 62)
                        note(1, pitch, t, d, 30)
                    else:
                        note(0, pitch + 12, t, d, 58)
                t += d
    beat += len(chords) * 4

# 最後に1小節休む（ループのつなぎ用の余韻）
end_tick = int((beat + 2) * TPB)
cc(0, 64, 0, beat + 1.5)

mid = mido.MidiFile(ticks_per_beat=TPB)
track = mido.MidiTrack()
mid.tracks.append(track)
track.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
for chan, prog in PROGRAMS.items():
    track.append(mido.Message('program_change', channel=chan, program=prog))
    track.append(mido.Message('control_change', channel=chan, control=91, value=70))  # リバーブ
    track.append(mido.Message('control_change', channel=chan, control=7, value={0: 100, 1: 80, 2: 70}[chan]))

events.sort(key=lambda e: (e[0], 0 if e[1].type == 'note_off' else 1))
last = 0
for tick, msg in events:
    track.append(msg.copy(time=tick - last))
    last = tick
track.append(mido.MetaMessage('end_of_track', time=max(0, end_tick - last)))
mid.save(sys.argv[1] if len(sys.argv) > 1 else 'bgm.mid')
print(f'{beat / 4:.0f} bars, {beat * 60 / BPM:.0f} s')
