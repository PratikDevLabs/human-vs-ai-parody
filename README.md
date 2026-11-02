# HUMAN vs AI — Overlord Arena | Neo-Delhi 2099

**1 Human. 3 AI Overlords. One Gujarati Chai.**

A neon-cyberpunk **2.5D arcade brawler** (Three.js, self-hosted) where you fight **Grok** (roast slinger), **ChatGPT** (essay bomber) and **Claude** (code matrix) — all at once. They talk, they roast, their words drain your HP. Your Brahmastra? A steaming cup of **Gujarati Chai**.

> Follow the dev: **[@pratik_roy_820](https://www.instagram.com/pratik_roy_820?rpxt=MTIyNncxaDZ4bXhhbg==)**

## Play instantly

Static site, **no build step** — deploy as-is on Vercel/Netlify/GitHub Pages, or run locally:

```bash
python3 -m http.server 8000
# → http://localhost:8000   (any static server works; ES modules need http, not file://)
```

PWA: installable, works offline after first load, OG image + manifest included.
Works on desktop keyboard + mobile multitouch (dynamic joystick, 56px+ buttons, portrait or landscape).

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | `A`/`D` or arrows | left-side dynamic joystick |
| Jump | `Space` / `W` / up | JUMP button or flick stick up |
| Punch | `J` / `Z` | PUNCH |
| Kick | `X` / `K` | KICK |
| Dodge (i-frames; perfect = slow-mo + chai) | `S` / `L` / down | DODGE |
| **Chai Brahmastra** (at 100% chai) | `C` / `V` / `Q` | teacup ULT button |
| Pause | `P` / `Esc` (tap pause screen to resume) | pause button |
| Fullscreen | `F` | fullscreen button |

## Combat design

- Real limb hitboxes on body overlap, pushboxes, stamina, 100 ms input buffer, combo scaling, hit-stop (60–160 ms) + screen shake on heavy hits.
- **Telegraphs everywhere:** ground decal + move-name banner + wind-up ring on the attacker card + off-screen edge arrows — every attack is dodgeable or jumpable.
- **Perfect dodge** (dodge within 120 ms of a hit): 0.3 s slow-mo, stamina + chai refund.
- 3:00 timer; time-up compares HP %. Best score + W/L saved in `localStorage`.
- **Cinematic ultimates** (letterbox, slow-mo, camera push):
  - **You — Gujarati Chai Brahmastra:** levitate, golden spiral, sip from a real teacup, then a golden shockwave torus that knocks **all 3 AIs**, cracks the ground, spikes bloom/CA, heals you, resets the meter.
  - **Grok — ROAST WAVE:** expanding ground rings (jump/dodge), HP + stamina + "mind" drain, glitch shards, no control reversal.
  - **ChatGPT — ESSAY DROP:** giant scrolling-text slab with a 1 s ground shadow telegraph, crushing impact, rubble slow zone.
  - **Claude — CODE MATRIX / COMPILE & EXECUTE:** ascends with 3 counter-rotating holo code rings, red lane telegraph "EXECUTING…", limited-turn-rate code laser (Hard: 3 sub-beams), DoT + `TypeError: human is not defined` glitch, then an overheat "COMPILATION FAILED" bonus-damage window; Med/Hard add a homing code-barrage ({}/NaN/404 panels you can punch for chai).
- AI FSM with attack tokens per difficulty (Easy 1 / Med 2 / Hard 3 simultaneous attackers), ults never overlap.

## Tech

- **Modular static site:** `index.html` + `src/` ES modules + `assets/` (self-hosted Three.js r170 pinned via importmap, fonts, icons, vendor addons). No bundler, no CDN at runtime.
- **Renderer:** 2.5D side-view lane camera that auto-frames all fighters; ACES tone mapping + UnrealBloom + custom vignette/grain/chromatic-aberration/heat-distortion shader pass; auto LOW/MED/HIGH quality (rolling FPS monitor, DPR steps 2→1.5→1, bloom off on LOW); fixed 60 Hz sim decoupled from render; pooled/instanced particles; < 150 draw calls; `?debug=1` overlay; Canvas2D fallback if WebGL is missing; global errors → toast, never a crash.
- **Art:** "Neo-Delhi 2099" — 5 parallax layers (moon/smog/lightning sky, skyline with shikhara/domes/minarets, mid-city holo billboards in Devanagari, chai tapri with neon "चाय" sign + auto-rickshaw + steam, foreground fog/embers) over a wet neon-grid floor with per-fighter light pools. Procedural articulated PBR fighter rigs with distinct silhouettes and full animation sets (idle/walk/attack anticipation/punch/kick/dodge/hurt/stun/cast/ult/KO).
- **Audio:** one WebAudio graph (Master → Music/SFX/Voice, limiter, convolver reverb, ducking under voice/ults), lazy after first gesture; layered synth SFX; dark synthwave sequencer. Voices: priority 1 = pre-rendered clips `assets/audio/voice/{char}_{event}_{n}.mp3` (HP 70 Hz → low-shelf +4 dB@180 → compressor → reverb; see `tools/VOICE_GENERATION.md` + `tools/voice_lines.csv`, edge-tts hi-IN), priority 2 = `speechSynthesis` with scored voice selection (hi-IN > en-IN > male en; pitch 0.80–0.95, rate 0.88–0.95), cancel-before-speak, one voice at a time, ults interrupt, subtitles for every line.
- **All strings** (dialogue + UI, Hinglish/English/Hindi) live in `src/data/dialogue.js`, keyed `character → event → variants`; all tuning in `src/config.js`. Zero emoji / zero unicode-glyph icons — one inline SVG sprite. Original abstract emblems only; no brand logos.
- **Mobile hygiene:** viewport-fit cover + safe areas, `touch-action: none`, no pull-to-refresh / double-tap zoom / long-press, fullscreen button, screen wake lock during fights, `navigator.vibrate` on hits, `prefers-reduced-motion` respected, colour-blind-safe palette toggle.
- Tested viewports: 360×640, 412×915, 768×1024, 1280×720, 1920×1080.

## Repo layout

```
index.html            shell + importmap + screen DOM
manifest.json  sw.js  favicon.svg
assets/css/style.css  design system + @font-face (self-hosted woff2)
assets/vendor/three/  pinned three.module.js r170 + postprocessing addons
assets/icons|og/      PWA icons + OG image (generated)
assets/audio/voice/   generated clips (git-ignored) + manifest.json
src/config.js         every tunable (fighters, combat, ults, AI, quality)
src/data/dialogue.js  all text: DIALOGUE + UI{en,hinglish,hi} + voiceLineRows()
src/core/             bus, errors(toast), storage, i18n, quality manager
src/game/             sim (pure, fixed-step), ai FSM, ults — headless-testable
src/render/           renderer3d (post chain), arena, rigs, fx3d, canvas2d fallback
src/ui/               hud, controls, screens, tutorial, icons (SVG sprite)
src/audio/            audio graph + SFX synth + music, voice director
tools/                VOICE_GENERATION.md + voice_lines.csv
```

## Dev

```bash
# syntax-check every module
for f in $(find src -name '*.js') sw.js; do node --input-type=module --check < "$f"; done

# headless sim test (pure modules, no DOM)
node --input-type=module -e "
import { sim, resetMatch, stepSim, setAxis, press, livingAIs } from './src/game/sim.js';
import { updateAI } from './src/game/ai.js';
import { SIM_DT } from './src/config.js';
resetMatch('hard'); sim.state = 'countdown';
let n = 0;
while (sim.state !== 'result' && n++ < 60*60*5) {
  if (sim.state === 'fight') {
    const t = livingAIs()[0]; if (t) { setAxis(Math.sign(t.x - sim.player.x)); press('punch'); }
    for (const f of sim.fighters) if (!f.isPlayer && f.alive) updateAI(sim, f, SIM_DT);
  }
  stepSim(SIM_DT);
}
console.log('result:', sim.result, sim.stats);
"
```

## License

MIT — see [LICENSE](LICENSE). Fan parody; no brand assets used.
