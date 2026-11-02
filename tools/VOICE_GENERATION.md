# Voice line generation — `assets/audio/voice/`

Every spoken line lives in `src/data/dialogue.js` (keyed `character → event → [variants]`).
This repo ships **without** the mp3s (they are generated locally and are git-ignored audio
assets — first load stays under 3 MB; clips are fetched lazily, cache-first via `sw.js`).
If a clip is missing, the game silently falls back to `speechSynthesis` (pitch 0.80–0.95,
rate 0.88–0.95 — never below 0.7) and still shows subtitles.

## 1. The line list

`tools/voice_lines.csv` is generated from `dialogue.js` (do not hand-edit; regenerate with):

```bash
node --input-type=module -e "
import { voiceLineRows } from './src/data/dialogue.js';
import { writeFileSync } from 'fs';
const esc = (s) => '\"' + String(s).replace(/\"/g, '\"\"') + '\"';
const rows = voiceLineRows();
writeFileSync('tools/voice_lines.csv',
  ['file,character,event,line', ...rows.map(r => [r.file, r.character, r.event, esc(r.line)].join(','))].join('\n') + '\n');
"
```

Naming convention (what `src/audio/voice.js` looks up): `{character}_{event}_{n}.mp3`,
e.g. `grok_ult_1.mp3` … `you_win_2.mp3`. 57 lines total.

## 2. Generate with edge-tts (recommended: hi-IN voices)

```bash
pip install edge-tts
mkdir -p assets/audio/voice
```

Voice mapping (edit to taste — the game applies its own EQ chain on top):

| character | edge-tts voice        | why                                  |
|-----------|-----------------------|--------------------------------------|
| you       | `hi-IN-MadhurNeural`  | warm neutral Indian male             |
| grok      | `hi-IN-SwaraNeural` (female) pitched down via `--rate`/`--pitch` OR `en-IN-PrabhatNeural` | raspy fast troll energy |
| chatgpt   | `en-IN-NeelNeural`    | calm, deep, measured                 |
| claude    | `hi-IN-MadhurNeural` at `--pitch=-8% --rate=-8%` | low, soft, deliberate |

Generate every row (CSV-driven, one file per line):

```bash
python3 - <<'PY'
import csv, subprocess, os
VOICES = {"you": "hi-IN-MadhurNeural", "grok": "en-IN-PrabhatNeural",
          "chatgpt": "en-IN-NeelNeural", "claude": "hi-IN-MadhurNeural"}
EXTRA = {"grok": ["--rate=+8%", "--pitch=+4%"],
         "chatgpt": ["--rate=-6%", "--pitch=-6%"],
         "claude": ["--rate=-8%", "--pitch=-8%"]}
os.makedirs("assets/audio/voice", exist_ok=True)
with open("tools/voice_lines.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        out = os.path.join("assets/audio/voice", row["file"])
        cmd = ["edge-tts", "--voice", VOICES[row["character"]], *EXTRA.get(row["character"], []),
               "--text", row["line"], "--write-media", out]
        print(" ".join(cmd[:6]), "...")
        subprocess.run(cmd, check=True)
PY
```

Then build the manifest the runtime fetches (`assets/audio/voice/manifest.json`):

```bash
node -e "
const fs = require('fs');
const dir = 'assets/audio/voice';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
const m = {};
for (const f of files) m[f] = 'assets/audio/voice/' + f;
fs.writeFileSync(dir + '/manifest.json', JSON.stringify(m, null, 2));
console.log('manifest with', files.length, 'clips');
"
```

## 3. Playback chain in-game (already wired)

Priority 1 clips play through the WebAudio graph:

```
BufferSource → highpass 70 Hz → low-shelf +4 dB @180 Hz → compressor → voice bus
                                                                    └→ reverb send (convolver)
```

This is what makes Grok sound raspy/fast and ChatGPT calm/deep even from the same TTS engine.
Priority 2 (`speechSynthesis`) scores voices async: `hi-IN` > `en-IN` > male `en`, with
female-name penalties so the robotic female default is never picked; utterance
`pitch ∈ [0.80, 0.95]`, `rate ∈ [0.88, 0.95]` (hard floor 0.7). `cancel()` before every new
line, one voice at a time, per-character cooldowns, ults interrupt, and every line is
mirrored to the subtitle bar. The last voice/mode is visible in the `?debug=1` overlay.

## 4. Notes

- edge-tts voices are Microsoft Azure neural voices; check their terms before publishing
  the audio publicly. The fallback TTS path needs no assets at all.
- Keep each clip short (the CSV lines are 1–2 sentences) — the runtime mutes ducking for
  `min(2.2s, 0.6s + chars*0.05)`.
- To preview one line: `edge-tts --voice hi-IN-MadhurNeural --text "Chal beta!" --write-media test.mp3 && open test.mp3`
