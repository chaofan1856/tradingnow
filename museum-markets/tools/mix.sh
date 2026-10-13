#!/usr/bin/env bash
# Mux out/video-only.mp4 with the score + sfx → out/认识交易市场.mp4
# Uses the first audio file in music/ if present (MUSIC=path overrides), else bgm.wav.
set -euo pipefail
cd "$(dirname "$0")/.."
cue() { python3 -c "print(round($1/30*1000))"; }
SONG="${MUSIC:-$(ls music/*.{mp3,m4a,wav,flac,aac,ogg} 2>/dev/null | head -1 || true)}"
START="${MUSIC_START:-0}"
SFX_DB="${SFX_DB:--16}"                          # sound-effect level in the mix (spec said −8; −16 keeps them under the music)

# year blocks appear at scene start + 8 frames → duck the bed 3 dB for one beat
DUCK=""; for s in 210 450 810 1170 1470 1770 2160; do
  a=$(python3 -c "print(round(($s+8)/30,3))"); b=$(python3 -c "print(round(($s+8)/30+0.45,3))")
  DUCK+="${DUCK:+,}volume=-3dB:enable='between(t,$a,$b)'"; done

if [[ -n "$SONG" ]]; then
  echo "music: $SONG (from ${START}s)"
  BED="[1]atrim=start=${START}:duration=78,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-27:TP=-3:LRA=11,afade=t=in:st=1.2:d=3,afade=t=out:st=76:d=2,${DUCK}[bed];[9]volume=-14dB[yr];[bed][yr]amix=inputs=2:normalize=0[bgm]"
  IN=(-i "$SONG"); EXTRA=(-i sfx/years.wav)
else
  echo "music: bgm.wav (synthesised)"
  BED="[1]volume=-20dB[bgm]"; IN=(-i bgm.wav); EXTRA=(-f lavfi -i anullsrc=r=48000:cl=stereo)
fi

ffmpeg -y -loglevel error -i out/video-only.mp4 "${IN[@]}" \
  -i sfx/ding.wav -i sfx/scale.wav -i sfx/paper.wav -i sfx/paper.wav -i sfx/rice.wav -i sfx/chain.wav -i sfx/tap.wav "${EXTRA[@]}" \
  -filter_complex "${BED};\
[2]adelay=$(cue 168):all=1,volume=${SFX_DB}dB[a2];[3]adelay=$(cue 262):all=1,volume=${SFX_DB}dB[a3];\
[4]adelay=$(cue 448):all=1,volume=${SFX_DB}dB[a4];[5]adelay=$(cue 1478):all=1,volume=${SFX_DB}dB[a5];\
[6]adelay=$(cue 1068):all=1,volume=${SFX_DB}dB[a6];[7]adelay=$(cue 1268):all=1,volume=${SFX_DB}dB[a7];\
[8]adelay=$(cue 2290):all=1,volume=${SFX_DB}dB[a8];\
[bgm][a2][a3][a4][a5][a6][a7][a8]amix=inputs=8:normalize=0:duration=first,volume=8dB,alimiter=limit=0.9:level=disabled,apad,atrim=duration=78[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -ar 48000 -t 78 -movflags +faststart "out/认识交易市场.mp4"
echo "wrote out/认识交易市场.mp4"
