# 🥊 HUMAN vs AI — Overlord Arena

**1 Human. 3 AI Overlords. Ek Gujarati Chai. ☕**

A neon-cyberpunk 2.5D arcade brawler where you fight **Grok** (psycho roaster), **ChatGPT** (essay bomber) and **Claude** (code-matrix) — all at once. They talk. They roast. Their words literally drain your HP. Your only Brahmastra? A steaming cup of **Gujarati Chai**.

> 📸 Follow the dev: **[@demon_tanjiro_820](https://www.instagram.com/demon_tanjiro_820/)** — *भड़ास निकालो - Instagram पर फॉलो करो!*

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

- **No button-mashing:** real hitboxes, attack cooldowns and a stamina system — distance + timing decide everything. Punch = fast, single-target. Kick = slow, sweeps the whole arc, and **interrupts AI casts**.
- **Signature AI powers on every difficulty:**
  - 😈 **Grok — Roast Wave:** psychological damage, drains HP **and** stamina, with live voice roasts (*"Bhai main toh nahi sehta!"*)
  - 🤖 **ChatGPT — Essay Block Drop:** telegraphed 10-page essay blocks rain from the sky
  - 🧠 **Claude — Code Burst Matrix:** volleys of `</>` projectiles (they home in on Hard!)
- **Smart AI brains:** surround slotting, melee-attack tokens (no cheap 3-on-1 stunlocks), reactive dodges, blocking, cast interruptions, low-HP retreats.
- **☕ Gujarati Chai Brahmastra:** charges as you deal/take damage. At 100% the button burns — unleash a full-screen cinematic blast that heals you, refills stamina and smashes all three overlords at once.
- **Difficulties:** 🌱 Easy (slower AI, fast chai) · ⚔️ Medium (the real fight) · 💀 Hard (simultaneous powers, homing code, brutal damage).

## 🔊 Voice acting (zero audio files)

Everything is synthesized live in the browser:

| Character | Voice profile |
|---|---|
| Grok | pitch `0.8`, rate `1.1`, hi-IN — sarcastic desi roasts |
| ChatGPT | pitch `1.0` — analytical "Certainly!" energy |
| Claude | pitch `1.2` — polite corporate menace |
| You | chai-powered Hindi one-liners |

SFX (punches, explosions, the chai blast) and the synthwave loop are generated with the Web Audio API. Speech bubbles + floating `-15 HP: Grok Roasted You!` glass toasts keep every hit readable.

## 🏆 The viral loop

Every match ends on a neon meme scorecard — grade (S→D), damage, max combo, accuracy, chai ults, roasts survived — with one-tap **Share** and the big glowing Instagram CTA. Screenshot it. Flex it. Challenge your friends.

## 🛠️ Tech

Single self-contained `index.html` (HTML5 Canvas 2.5D parallax renderer + glassmorphism HUD + vanilla ES6 engine). Procedurally animated fighters, particles, hitstop, screen-shake, slow-mo K.O.s — no frameworks, no trackers, runs offline.

## 📄 License

MIT — see [LICENSE](LICENSE).
