let voices = [];
let voicesLoaded = false;

function loadVoices() {
  try {
    voices = speechSynthesis.getVoices();
    voicesLoaded = voices.length > 0;
  } catch (_) {}
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

// Quality voice picks (in priority order) — premium voices on macOS/iOS
const QUALITY_NAMES = [
  'Samantha', 'Alex', 'Daniel', 'Karen', 'Moira', 'Tessa', 'Fiona',
  'Google US English', 'Google UK English Male', 'Google UK English Female',
  'Microsoft Zira', 'Microsoft David', 'Microsoft Mark',
];

function pickVoice(filter) {
  if (!voicesLoaded) loadVoices();
  if (!voices.length) return null;
  // Try quality names first
  for (const name of QUALITY_NAMES) {
    const v = voices.find(v => v.name.includes(name) && (!filter || filter(v)));
    if (v) return v;
  }
  // Fallback to any English voice matching filter
  const en = voices.find(v => v.lang.startsWith('en') && (!filter || filter(v)));
  if (en) return en;
  return voices[0];
}

const voiceCache = {};

function getVoice(role) {
  if (voiceCache[role]) return voiceCache[role];
  let v;
  if (role === 'male') {
    v = pickVoice(v => /alex|daniel|david|mark|google uk english male/i.test(v.name));
  } else if (role === 'female') {
    v = pickVoice(v => /samantha|karen|moira|tessa|fiona|zira|google us english$|google uk english female/i.test(v.name));
  } else if (role === 'deep') {
    v = pickVoice(v => /alex|daniel|david/i.test(v.name));
  } else if (role === 'high') {
    v = pickVoice(v => /samantha|karen|tessa/i.test(v.name));
  } else {
    v = pickVoice();
  }
  voiceCache[role] = v;
  return v;
}

export const VOICE = {
  // Hero / player — clear, friendly
  hero: { role: 'male', pitch: 1.0, rate: 1.0, volume: 1 },
  // Villain / boss — deep, slow, menacing
  villain: { role: 'deep', pitch: 0.5, rate: 0.85, volume: 1 },
  // Narrator — calm, neutral
  narrator: { role: 'female', pitch: 0.95, rate: 0.95, volume: 1 },
  // NPC — friendly
  npc: { role: 'male', pitch: 1.05, rate: 1.0, volume: 1 },
  // Mysterious — soft female
  mysterious: { role: 'high', pitch: 0.7, rate: 0.85, volume: 0.9 },
  // Robot — flat, mid pitch
  robot: { role: 'male', pitch: 0.8, rate: 0.95, volume: 1 },
  // Excited — fast, high
  excited: { role: 'female', pitch: 1.3, rate: 1.15, volume: 1 },
  // Whisper — quiet, slow
  whisper: { role: 'female', pitch: 0.6, rate: 0.7, volume: 0.5 },
  // Joker — high, fast, manic
  joker: { role: 'male', pitch: 1.4, rate: 1.2, volume: 1 },
  // Batman — very deep, gravelly
  batman: { role: 'deep', pitch: 0.4, rate: 0.85, volume: 1 },
};

export function speak(text, profile) {
  if (!text || typeof speechSynthesis === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const p = typeof profile === 'string' ? VOICE[profile] : profile;
    if (p) {
      u.pitch = Math.max(0, Math.min(2, p.pitch));
      u.rate = Math.max(0.1, Math.min(2, p.rate));
      u.volume = p.volume != null ? p.volume : 1;
      const v = getVoice(p.role);
      if (v) u.voice = v;
    }
    speechSynthesis.speak(u);
  } catch (_) {}
}

export function cancelSpeech() {
  try { speechSynthesis.cancel(); } catch (_) {}
}
