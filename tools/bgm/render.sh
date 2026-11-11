#!/bin/sh
# BGM を作り直す：python3 と mido、fluidsynth、FluidR3_GM.sf2、ffmpeg が必要
set -e
cd "$(dirname "$0")/../.."
T=$(mktemp -d)
python3 tools/bgm/compose.py "$T/bgm.mid"
fluidsynth -ni -q -g 0.6 -R 1 -F "$T/bgm.wav" -r 44100 /usr/share/sounds/sf2/FluidR3_GM.sf2 "$T/bgm.mid"
# テープのような柔らかさ：高音を少し丸め、ごくわずかな揺れ（ワウ）とヒスノイズを足す
ffmpeg -v error -y -i "$T/bgm.wav" -f lavfi -i "anoisesrc=color=pink:amplitude=0.004:seed=3:duration=200" \
  -filter_complex "[0]highpass=f=45,lowpass=f=6500,vibrato=f=0.45:d=0.012,acompressor=threshold=-24dB:ratio=2:attack=40:release=400[m];[1]lowpass=f=5000,highpass=f=300[n];[m][n]amix=inputs=2:duration=first:weights=1 1:normalize=0,loudnorm=I=-24:TP=-3:LRA=11" \
  -ar 44100 -ac 2 -c:a libmp3lame -b:a 112k public/audio/music/bgm.mp3
rm -r "$T"
