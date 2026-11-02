# 🥊 HUMAN vs AI — Overlord Arena

**1 Human. 3 AI Overlords. Ek Gujarati Chai. ☕**

A neon-cyberpunk 2.5D arcade brawler where you fight **Grok** (psycho roaster), **ChatGPT** (essay bomber) and **Claude** (code-matrix) — all at once. They talk. They roast. Their words literally drain your HP. Your only Brahmastra? A steaming cup of **Gujarati Chai**.

> 📸 Follow the dev: **[@pratik_roy_820](https://www.instagram.com/pratik_roy_820?rpxt=MTIyNncxaDZ4bXhhbg==)** — *भड़ास निकालो - Instagram पर फॉलो करो!*

## ▶️ Play instantly

No build. No dependencies. No paid APIs. Just open the file:

```bash
# Option A: double-click index.html in any modern browser

# Option B: serve locally
python3 -m http.server 8000
# → http://localhost:8000
```

Works on desktop + mobile touchscreens. 🔊 **Sound ON recommended** — the AIs roast you with real voices (Web Speech API).

## 🎮 Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | `A`/`D` or `◀`/`▶` | Virtual joystick |
| Jump | `Space` / `W` / `▲` | `JUMP` button or flick joystick up |
| Punch | `J` | 👊 PUNCH |
| Kick | `K` | 🦵 KICK |
| Dodge (i-frames) | `Shift` / `L` | 💨 DODGE |
| **Gujarati Chai Ult** | `F` (at 100%) | ☕ fiery CHAI button |
| Pause / Mute | `P` / `Esc` · `M` | HUD buttons |

## ⚔️ Combat design

- **No button-mashing:** real hitboxes, attack cooldowns and a stamina system — fighters **physically lunge toward each other and collide** (body pushback), punches/kicks land only on **direct body contact** with impact sparks, and floating `-25 HP` damage numbers pop on every hit. Punch = fast, single-target. Kick = slow, sweeps the whole arc, and **interrupts AI casts**.
- **Cinematic ultimates with letterbox slow-mo (every difficulty):**
  - ☕ **You — Gujarati Chai Brahmastra:** the human literally **lifts off the ground** with glowing particles, **levitates mid-air sipping a steaming cup of chai**, then unleashes an **earth-shattering shockwave that hits all 3 AIs simultaneously** (screen shake, ground cracks, they get launched).
  - 😈 **Grok — Psychological Roast Wave:** expanding rings of toxic roast glyphs, red screen tint, HP **and** stamina + mind damage — with live voice roasts (*"Bhai main toh nahi sehta!"*, *"Khel khatam beta, ab ghar ja!"*)
  - 🤖 **ChatGPT — Massive 10-Page Essay Block:** one giant telegraphed essay block ("YOU LOSE" stamp) crashes down with debris and a huge shockwave (*"Beta, tumse na ho payega, logic padh lo pehle."*)
  - 🧠 **Claude — Matrix Laser Stream:** a screen-shaking, jagged laser beam fired from his visor straight into you with matrix-glyph rain and tick damage (*"Oops! Syntax error in your life choices."*)
- **Smart AI brains:** surround slotting, melee-attack tokens (no cheap 3-on-1 stunlocks), reactive dodges, blocking, cast interruptions, low-HP retreats.
- **☕ Gujarati Chai Brahmastra:** charges as you deal/take damage. At 100% the button burns — unleash a full-screen cinematic blast that heals you, refills stamina and smashes all three overlords at once.
- **Difficulties:** 🌱 Easy (slower AI, fast chai) · ⚔️ Medium (the real fight) · 💀 Hard (simultaneous powers, homing code, brutal damage).

## 🔊 Voice acting (zero audio files)

Everything is synthesized live in the browser:

The engine explicitly **locks onto a deep, heavy male Hindi / Indian-English voice** (`hi-IN` → `en-IN` → any male-branded voice → deep-pitched fallback, pitch ≤ 0.55) so it never sounds like the robotic female default. All roasts are aggressive Hinglish:

| Character | Voice profile |
|---|---|
| Grok | `hi-IN`, pitch `0.55` — *"Bhai main toh nahi sehta!"* / *"Khel khatam beta, ab ghar ja!"* |
| ChatGPT | `hi-IN`, pitch `0.65` — *"Beta, tumse na ho payega, logic padh lo pehle."* |
| Claude | `hi-IN`, pitch `0.75` — *"Oops! Syntax error in your life choices."* |
| You | `hi-IN`, pitch `0.85` — chai-powered one-liners |

SFX (punches, explosions, the chai blast) and the synthwave loop are generated with the Web Audio API. Speech bubbles + floating `-15 HP: Grok Roasted You!` glass toasts keep every hit readable.

## 🏆 The viral loop

Every match ends on a neon meme scorecard — grade (S→D), damage, max combo, accuracy, chai ults, roasts survived — with one-tap **Share** and the big glowing Instagram CTA. Screenshot it. Flex it. Challenge your friends.

## 🛠️ Tech

Single self-contained `index.html` (HTML5 Canvas 2.5D parallax renderer + glassmorphism HUD + vanilla ES6 engine). Procedurally animated fighters, particles, hitstop, screen-shake, slow-mo K.O.s — no frameworks, no trackers, runs offline.

## 📄 License

MIT — see [LICENSE](LICENSE).
