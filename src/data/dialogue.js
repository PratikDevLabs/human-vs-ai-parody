// ============================================================
// src/data/dialogue.js — ALL spoken / displayed strings.
// Structure: DIALOGUE[character][event] = [variants...]  (i18n-ready).
// The developer can rewrite these lines later; the engine only
// reads this file. UI[lang][key] holds interface strings.
// tools/voice_lines.csv is generated FROM this file.
// ============================================================

export const DIALOGUE = {
  grok: {
    intro: [
      "Chal beta, aaj tera asli test hai!",
      "Human vs AI? Bhai, aaj teri haar pakki hai!",
    ],
    ult: [
      "Bhai, main toh nahi sehta itni beizzati!",
      "Bhai, main toh nahi sehta itni beizzati!",
      "Tumse na ho payega, beta!",
      "Roast incoming — brace yourself!",
    ],
    attack: [
      "Ye lo roast!",
      "Aukaat mein raho, human!",
      "LOL, bas ye tha?",
    ],
    hit: ["Dard hua? Aur milega!", "Bas itna hi dum hai?"],
    lowhp: ["Bas? Itni hi jaan thi tere mein?", "HP khatam honey wala hai, haath jod lo!"],
    hurt: ["Arey! Ye toh cheating hai!", "Lag gayi… matlab, kuch nahi hua!"],
    ko: ["Nahi! Main toh bas mazak kar raha tha!", "Delete ho raha hoon… maa!"],
    win: [
      "Khel khatam! Ab chup-chap ghar jaake soti babu!",
      "Khel khatam beta, ab ghar ja!",
    ],
  },
  chatgpt: {
    intro: [
      "Welcome! Aaj toh tum pakka harne wale ho.",
      "As an AI, main aaj pakka jeetne wala hoon.",
    ],
    ult: [
      "Yeh lo mera lamba-chauda lecture!",
      "Here is a 10-page essay on why you will lose.",
      "Essay drop in 3… 2… 1…",
    ],
    attack: ["Noted. Ab aur hard hit karunga.", "As previously mentioned, that was going to hurt."],
    hit: ["Noted. Adjusting strategy to hit harder."],
    lowhp: ["Tumhari HP critical hai, beta.", "Mistakes ka summary chahiye?"],
    hurt: ["I apologize, par woh sach mein hurt kiya.", "Error! Woh meri training data mein nahi tha."],
    ko: ["Session terminated. Goodbye, beta."],
    win: ["In summary: tum haar gaye. Shukriya for playing!"],
  },
  claude: {
    intro: [
      "Chalo game shuru karte hain, bina kisi faltu baat ke.",
      "I appreciate your courage, beta. Let us begin.",
    ],
    ult: [
      "Yeh le seedha direct attack!",
      "Oops! Syntax error in your life choices.",
      "Deploying matrix laser stream.",
      "12 outcomes analyze kiye — sab mein tum haarte ho.",
    ],
    attack: ["Tumhari defense bekaar hai.", "Mujhe afsos hai us hit ka."],
    hit: ["My analysis says your HP is dropping."],
    lowhp: ["Respectfully: tumhari HP critical level pe hai."],
    hurt: ["Woh surprisingly effective tha. Noted.", "Feedback mil gaya. Ouch."],
    ko: ["Thank you for the match. Gracefully powering down.", "I decline to continue."],
    win: ["Thank you for playing. Afsos hai — main jeet gaya."],
  },
  you: {
    ult: ["Ab ayega maza! Gujarati chai, Brahmastra!", "Chai pee, duniya jeeti! Ye lo kadak jawab!"],
    ultHit: ["Ye lo! Chai ka josh!", "Steaming hot! Sab jal gaya!"],
    hurt: ["Aah! Ruko zara, sabar karo!", "Lag gayi! Par human rukta nahi!"],
    ko: ["Chai… khatam ho gayi…"],
    win: ["Dekha! Human abhi bhi baap hai!", "Teen AI, ek chai — khel khatam!"],
  },
};

// ---- UI strings, i18n-ready (lang -> key). Missing keys fall back to en. ----
export const UI = {
  en: {
    play: 'PLAY', fighters: 'FIGHTERS', settings: 'SETTINGS', stats: 'STATS',
    difficulty: 'DIFFICULTY', back: 'BACK', resume: 'RESUME', restart: 'RESTART MATCH',
    quit: 'MAIN MENU', paused: 'PAUSED', victory: 'VICTORY', defeat: 'DEFEAT',
    retry: 'RETRY', changeDiff: 'CHANGE DIFFICULTY', shareCard: 'SHARE CARD',
    fight: 'FIGHT!', round: 'ROUND 1', mission: 'Knock out all 3 AI overlords. Charge the Chai meter and unleash the Brahmastra!',
    chaiReady: 'CHAI READY — UNLEASH!', hp: 'HP', stamina: 'STAMINA', chai: 'CHAI',
    perfect: 'PERFECT DODGE', combo: 'COMBO', ultReady: 'ULT READY',
    ctaHeading: 'AI se badla pura nahi hua?',
    ctaBody: "Developer ko Instagram par follow karke support karo, apna high score ya defeat ka screenshot bhejo, aur agle update mein game ke andar apna naam chamkaane ka mauka pao!",
    ctaButton: 'Developer ko Follow karo & Score Bhejo!',
    tutorialSkip: 'SKIP', tutorialNext: 'NEXT',
    quality: 'Quality', language: 'Language', volumes: 'Volumes', controls: 'Controls',
    motion: 'Reduce motion', haptics: 'Haptics', colourblind: 'Colour-blind safe palette',
    subtitles: 'Subtitles', leftHanded: 'Left-handed controls', buttonSize: 'Button size',
    master: 'Master', music: 'Music', sfx: 'SFX', voice: 'Voice',
    rotateHint: 'Rotate your phone for the best experience — portrait also works!',
    webglFallback: 'WebGL unavailable — running in reduced 2D mode.',
    install: 'INSTALL GAME',
  },
  hinglish: {
    play: 'KHELo', fighters: 'FIGHTERS', settings: 'SETTINGS', stats: 'STATS',
    difficulty: 'DIFFICULTY', back: 'WAPAS', resume: 'CHALU KARO', restart: 'FIR SE', quit: 'MENU',
    paused: 'ROKA GAYA', victory: 'JEET GAYA!', defeat: 'HAAR GAYA', retry: 'FIR SE KHELEO',
    changeDiff: 'LEVEL BADLO', shareCard: 'SCORE SHARE KARO', fight: 'LADO!',
    round: 'ROUND 1', mission: 'Teeno AI ko K.O. karo. Chai meter bharo aur Brahmastra chalao!',
    chaiReady: 'CHAI TAYYAR — CHALAO!', hp: 'HP', stamina: 'TAKAT', chai: 'CHAI',
    perfect: 'BADHIA DODGE', combo: 'COMBO', ultReady: 'ULT TAYYAR',
    ctaHeading: 'AI se badla pura nahi hua?',
    ctaBody: "Developer ko Instagram par follow karke support karo, apna high score ya defeat ka screenshot bhejo, aur agle update mein game ke andar apna naam chamkaane ka mauka pao!",
    ctaButton: 'Developer ko Follow karo & Score Bhejo!',
    tutorialSkip: 'CHHODO', tutorialNext: 'AAGE',
    quality: 'Graphics quality', language: 'Bhasha', volumes: 'Aawaz', controls: 'Controls',
    motion: 'Kam animation', haptics: 'Vibration', colourblind: 'Colour-blind safe rang',
    subtitles: 'Subtitles', leftHanded: 'Left-hand controls', buttonSize: 'Button size',
    master: 'Master', music: 'Music', sfx: 'Effects', voice: 'Voice',
    rotateHint: 'Best experience ke liye phone rotate karo — portrait bhi chalega!',
    webglFallback: 'WebGL nahi mila — 2D mode mein chal raha hai.',
    install: 'GAME INSTALL KARO',
  },
  hi: {
    play: 'KHELO', difficulty: 'KATHINAI', back: 'VAAPAS', resume: 'JARI RAKHO',
    paused: 'ROKA GAYA', victory: 'JEET!', defeat: 'HAAR', retry: 'DOBARA', settings: 'SETTINGS',
    ctaHeading: 'AI se badla pura nahi hua?',
    ctaBody: "Developer ko Instagram par follow karke support karo, apna high score ya defeat ka screenshot bhejo, aur agle update mein game ke andar apna naam chamkaane ka mauka pao!",
    ctaButton: 'Developer ko Follow karo & Score Bhejo!',
  },
};

// ---- extended UI strings (names, chips, ult names, screens, tutorial) ----
Object.assign(UI.en, {
  menuTitle: 'HUMAN vs AI', menuTag: 'OVERLORD ARENA — NEO-DELHI 2099',
  best: 'BEST', wins: 'WINS', losses: 'LOSSES', draws: 'DRAWS',
  vs: 'VS', loading: 'LOADING ARENA',
  name_you: 'YOU', name_grok: 'GROK', name_chatgpt: 'CHATGPT', name_claude: 'CLAUDE',
  chip_idle: 'IDLE', chip_atk: 'ATTACK', chip_cast: 'CASTING', chip_ult: 'ULT', chip_stun: 'STUNNED', chip_dodge: 'DODGE', chip_ko: 'K.O.',
  ult_name: 'CHAI BRAHMASTRA',
  ult_you: 'CHAI BRAHMASTRA', ult_grok: 'ROAST WAVE', ult_chatgpt: 'ESSAY DROP', ult_claude: 'CODE MATRIX — COMPILE & EXECUTE',
  cast_grok: 'ROAST CHARGING', cast_chatgpt: 'ESSAY CHARGING', cast_claude: 'COMPILING',
  atk_punch: 'PUNCH', atk_kick: 'KICK', atk_roastBolt: 'ROAST BOLT', atk_slam: 'SLAM', atk_codeVolley: 'CODE VOLLEY',
  diff_easy: 'EASY', diff_medium: 'MEDIUM', diff_hard: 'HARD',
  diffDesc_easy: 'Chill sparring — the AIs hold back.',
  diffDesc_medium: 'They mean business. Watch the telegraphs.',
  diffDesc_hard: 'Overlord mode. Every attack is dodgeable — barely.',
  st_dealt: 'DAMAGE DEALT', st_taken: 'DAMAGE TAKEN', st_combo: 'MAX COMBO', st_perfect: 'PERFECT DODGES',
  st_chai: 'CHAI ULTS', st_kos: 'K.O.s', st_time: 'FIGHT TIME', st_grade: 'GRADE', newBest: 'NEW BEST SCORE!',
  result_you_win: 'All three overlords deleted. Chai tastes sweeter tonight.',
  result_you_lose: 'The machines win this round. Sip some chai and run it back.',
  result_draw: 'A draw. Even the arena is confused.',
  tut_1: 'Move with A/D or the left joystick.',
  tut_2: 'Punch & Kick — stamina is limited, spend it well.',
  tut_3: 'Jump over shockwaves. Dodge (just before a hit) = PERFECT: slow-mo + chai + stamina refund.',
  tut_4: 'Land hits to charge the CHAI meter. At full, press the teacup button for the Brahmastra.',
  tut_5: 'Red zones on the ground = incoming hit. Dodge or jump.',
  tut_6: 'Defeat all 3 AIs before the 3:00 timer. Good luck!',
  pauseHint: 'Tap anywhere or press P to resume',
  credit: 'An original parody arena — no brand assets used.',
  help: 'HOW TO PLAY', installDesc: 'Add to home screen for offline play.',
  pause: 'PAUSED', resumeBtn: 'RESUME',
  kb_move: 'MOVE', kb_punch: 'PUNCH', kb_kick: 'KICK', kb_jump: 'JUMP', kb_dodge: 'DODGE', kb_ult: 'CHAI ULT',
  quality_auto: 'AUTO', quality_low: 'LOW', quality_med: 'MEDIUM', quality_high: 'HIGH',
  lang_en: 'English', lang_hinglish: 'Hinglish', lang_hi: 'Hindi',
  on: 'ON', off: 'OFF',
});
Object.assign(UI.hinglish, {
  menuTitle: 'HUMAN vs AI', menuTag: 'OVERLORD ARENA — NEO-DELHI 2099',
  best: 'BEST', wins: 'JEET', losses: 'HAAR', draws: 'DRAW',
  vs: 'VS', loading: 'ARENA LOAD HO RAHA HAI',
  name_you: 'TU', name_grok: 'GROK', name_chatgpt: 'CHATGPT', name_claude: 'CLAUDE',
  chip_idle: 'AARAAM', chip_atk: 'HAMLA', chip_cast: 'CHARGING', chip_ult: 'ULT', chip_stun: 'STUN', chip_dodge: 'DODGE', chip_ko: 'K.O.',
  ult_name: 'CHAI BRAHMASTRA',
  ult_you: 'CHAI BRAHMASTRA', ult_grok: 'ROAST WAVE', ult_chatgpt: 'ESSAY DROP', ult_claude: 'CODE MATRIX — COMPILE & EXECUTE',
  cast_grok: 'ROAST CHARGE', cast_chatgpt: 'ESSAY CHARGE', cast_claude: 'COMPILING',
  atk_punch: 'GHUSA', atk_kick: 'LATH', atk_roastBolt: 'ROAST BOLT', atk_slam: 'DHAMAKA', atk_codeVolley: 'CODE VOLLEY',
  diff_easy: 'AASAAN', diff_medium: 'MEDIUM', diff_hard: 'KATHIN',
  diffDesc_easy: 'Aaram se ladoge — AI dheela khelega.',
  diffDesc_medium: 'Ab serious hain. Telegraphs dekho.',
  diffDesc_hard: 'Overlord mode. Har attack dodge ho sakta hai — mushkil se.',
  st_dealt: 'DAAMAGE KIYA', st_taken: 'DAAMAGE LIA', st_combo: 'MAX COMBO', st_perfect: 'PERFECT DODGE',
  st_chai: 'CHAI ULT', st_kos: 'K.O.', st_time: 'SAMAY', st_grade: 'GRADE', newBest: 'NAYA BEST SCORE!',
  result_you_win: 'Teeno overlords delete. Aaj chai aur meethi lagegi.',
  result_you_lose: 'Machines jeet gayi. Chai piyo aur dobara maaro.',
  result_draw: 'Draw. Arena bhi confuse ho gaya.',
  tut_1: 'A/D ya left joystick se hilein.',
  tut_2: 'Ghusa aur lath — takat limited hai, samajhdaar tareeke se kharch karo.',
  tut_3: 'Shockwave ke upar se kudiyo. Hit se theek pehle dodge = PERFECT: slow-mo + chai + takat wapas.',
  tut_4: 'Hits maaro taaki CHAI meter bhare. Full hone par teacup button dabao — Brahmastra!',
  tut_5: 'Zameen par laal zone = hit aane wala hai. Dodge karo ya kudiyo.',
  tut_6: '3:00 se pehle teeno AI ko K.O. karo. Shubh kaamnaayein!',
  pauseHint: 'Kahin bhi tap karo ya P dabao — resume karne ke liye',
  credit: 'Ek original parody arena — koi brand assets nahi.',
  help: 'KAISE KHELEIN', installDesc: 'Offline khelne ke liye home screen par add karo.',
  pause: 'ROKA GAYA', resumeBtn: 'CHALU KARO',
  kb_move: 'HILNA', kb_punch: 'GHUSA', kb_kick: 'LATH', kb_jump: 'KUDNA', kb_dodge: 'DODGE', kb_ult: 'CHAI ULT',
  quality_auto: 'AUTO', quality_low: 'LOW', quality_med: 'MEDIUM', quality_high: 'HIGH',
  lang_en: 'English', lang_hinglish: 'Hinglish', lang_hi: 'Hindi',
  on: 'ON', off: 'OFF',
});

export function t(lang, key) {
  return (UI[lang] && UI[lang][key]) || UI.en[key] || key;
}

// Flatten dialogue into the file list used by tools/VOICE_GENERATION.md
export function voiceLineRows() {
  const rows = [];
  for (const [char, events] of Object.entries(DIALOGUE)) {
    for (const [event, variants] of Object.entries(events)) {
      variants.forEach((line, i) => {
        rows.push({ file: `${char}_${event}_${i + 1}.mp3`, character: char, event, line });
      });
    }
  }
  return rows;
}
