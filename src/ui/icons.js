// ============================================================
// src/ui/icons.js — ONE inline SVG icon sprite. Zero emoji, zero
// unicode-glyph icons anywhere in the app. Emblems are original
// abstract marks (no brand logos).
// ============================================================

const S = (inner, vb = '0 0 24 24') =>
  `<svg class="ic" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const F = (inner, vb = '0 0 24 24') =>
  `<svg class="ic" viewBox="${vb}" fill="currentColor" stroke="none" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  // ---- fighter emblems (original abstract marks) ----
  emblemYou: `<svg class="ic emb" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="19" stroke="currentColor" stroke-width="3.4"/>
    <path d="M15 20h16l-2.6 11a3 3 0 0 1-3 2.4h-4.8a3 3 0 0 1-3-2.4L15 20z" fill="currentColor"/>
    <path d="M31 22h3.4a3.4 3.4 0 0 1 0 6.8H30" stroke="currentColor" stroke-width="2.6"/>
    <path d="M20 14c-1.4-2 1.4-3 0-5M25 14c-1.4-2 1.4-3 0-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,
  emblemGrok: `<svg class="ic emb" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 3 43 24 24 45 5 24 24 3z" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M16 16l16 16M32 16 16 32" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>
  </svg>`,
  emblemChatgpt: `<svg class="ic emb" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 4l17 10v20L24 44 7 34V14L24 4z" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M24 13l9 5.2v10.4L24 34l-9-5.4V18.2L24 13z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="24" cy="24" r="3.4" fill="currentColor"/>
  </svg>`,
  emblemClaude: `<svg class="ic emb" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 4l6 8-6 8-6-8 6-8zM24 20l6 8-6 8-6-8 6-8zM24 36l6 8-6 8-6-8 6-8z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" transform="translate(0,-4) scale(0.92)"/>
  </svg>`,

  // ---- actions ----
  punch: S('<circle cx="12" cy="13" r="6.2"/><path d="M7.5 10.5h9M7.5 13h9M7.5 15.5h7" stroke-width="1.7"/>'),
  kick: S('<path d="M6 20l4-9 3 4 6-8"/><path d="M19 7l2 2-6 6-2-2 6-6z" fill="currentColor" stroke="none"/>'),
  jump: S('<path d="M5 15l7-7 7 7M5 20l7-7 7 7" stroke-width="2.4"/>'),
  dodge: S('<path d="M4 12h9a5 5 0 0 1 0 10h-3"/><path d="M8 8l-4 4 4 4"/>'),
  chai: S('<path d="M5 10h11v4.5A5.5 5.5 0 0 1 10.5 20h0A5.5 5.5 0 0 1 5 14.5V10z"/><path d="M16 11h1.6a2.6 2.6 0 0 1 0 5.2H16"/><path d="M8 7c-1-1.2 1-2 0-3.4M12 7c-1-1.2 1-2 0-3.4"/>'),

  // ---- chrome ----
  play: F('<path d="M7 4.5v15l13-7.5-13-7.5z"/>'),
  pause: F('<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>'),
  sound: S('<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  mute: S('<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 9l5 6M21 9l-5 6"/>'),
  music: S('<path d="M9 18V6l10-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>'),
  full: S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  exitFull: S('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  share: S('<circle cx="6" cy="12" r="2.6"/><circle cx="17" cy="5.5" r="2.6"/><circle cx="17" cy="18.5" r="2.6"/><path d="M8.3 10.8l6.4-4M8.3 13.2l6.4 4"/>'),
  gear: S('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18" stroke-width="2.6"/>'),
  back: S('<path d="M15 5l-7 7 7 7" stroke-width="2.6"/>'),
  instagram: S('<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none"/>'),
  trophy: S('<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5H4.5a3.5 3.5 0 0 0 3.6 3.5M16 5h3.5a3.5 3.5 0 0 1-3.6 3.5M12 13v3M8.5 20h7M10 16.5h4l.8 3.5H9.2l.8-3.5z"/>'),
  bolt: F('<path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"/>'),
  heart: S('<path d="M12 20s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 11c-1.8 4.4-9.3 9-9.3 9z"/>'),
  gauge: S('<path d="M4 14a8 8 0 1 1 16 0"/><path d="M12 14l4.5-5"/><circle cx="12" cy="14" r="1.6" fill="currentColor"/>'),
  globe: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 2.6 3 14.4 0 17-3-2.6-3-14.4 0-17z"/>'),
  hand: S('<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6.5 7S5 17.5 5 14v-3a1.5 1.5 0 0 1 3 0"/>'),
  eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: S('<path d="M2.5 12S6 5.5 12 5.5c1.8 0 3.4.6 4.7 1.4M21.5 12S18 18.5 12 18.5c-1.8 0-3.4-.6-4.7-1.4M4 4l16 16"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  vibrate: S('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M10 18h4M3 9c-1 1-1 5 0 6M21 9c1 1 1 5 0 6"/>'),
  palette: S('<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.4-2.2-.8-1.5.2-2.8 1.8-2.8H17a4.5 4.5 0 0 0 4-4.5C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="10.5" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1.3" fill="currentColor"/>'),
  star: F('<path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.6l6.3-.8L12 3z"/>'),
  trophySmall: S('<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M12 13v3M8 20h8M12 16l-2.5 4h5L12 16z"/>'),
  skull: S('<path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.4 3 5.4V19a1.5 1.5 0 0 0 1.5 1.5h6A1.5 1.5 0 0 0 16.5 19v-3.1c1.7-1 3-2.8 3-5.4A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.6" fill="currentColor"/><circle cx="15" cy="11" r="1.6" fill="currentColor"/><path d="M12 14.5l-1 2h2l-1-2z" fill="currentColor"/>'),
  chevron: S('<path d="M6 9l6 6 6-6"/>'),
  target: S('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  help: S('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.6 2.3c-.9.5-1.2 1-1.2 1.9"/><circle cx="12" cy="16.8" r="0.9" fill="currentColor"/>'),
};

export function icon(name, cls = '') {
  const s = ICONS[name] || ICONS.help;
  return cls ? s.replace('class="ic', `class="ic ${cls}`) : s;
}
