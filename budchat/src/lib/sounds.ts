"use client";

/**
 * Notification sounds, synthesised in the browser.
 *
 * No audio files: nothing to download, nothing to cache, and it still works
 * with no signal on site — which matters more here than richer sounds would.
 * Every signal is short and dry on purpose; a melody is inaudible next to a
 * demolition hammer and arrives too late to mean anything.
 */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  return context;
}

/**
 * Browsers refuse to start audio until the user has interacted with the page.
 * Called once from a real tap so later notification sounds are allowed.
 */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => undefined);
}

interface Tone {
  /** Start frequency in Hz. */
  freq: number;
  /** Optional end frequency for a sweep. */
  toFreq?: number;
  /** Seconds from the start of the sound. */
  at: number;
  /** Seconds. */
  duration: number;
  type: OscillatorType;
  /** Relative loudness within the sound, 0..1. */
  gain: number;
}

const RECIPES: Record<string, Tone[]> = {
  ping: [{ freq: 880, at: 0, duration: 0.16, type: "sine", gain: 1 }],
  knock: [
    { freq: 180, at: 0, duration: 0.09, type: "triangle", gain: 1 },
    { freq: 150, at: 0.11, duration: 0.11, type: "triangle", gain: 0.85 }
  ],
  chirp: [{ freq: 1200, toFreq: 2200, at: 0, duration: 0.13, type: "sine", gain: 0.9 }],
  bell: [
    { freq: 660, at: 0, duration: 0.55, type: "sine", gain: 0.8 },
    { freq: 990, at: 0.01, duration: 0.45, type: "sine", gain: 0.4 }
  ],
  none: []
};

export function soundExists(name: string): boolean {
  return name in RECIPES;
}

/**
 * Plays one of the built-in signals. Never throws and never blocks: if audio
 * is unavailable or still locked, the call is simply a no-op — a missing
 * chime must not break message delivery.
 */
export function playSound(name: string, volumePercent = 70): void {
  const recipe = RECIPES[name];
  if (!recipe || recipe.length === 0) return;

  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

  const master = Math.min(1, Math.max(0, volumePercent / 100)) * 0.35;
  if (master === 0) return;

  const now = ctx.currentTime;

  for (const tone of recipe) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + tone.at;
    const end = start + tone.duration;

    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, start);
    if (tone.toFreq) osc.frequency.exponentialRampToValueAtTime(tone.toFreq, end);

    // A short attack avoids the click a hard start would make, and an
    // exponential tail is what makes the signal read as a "note" rather
    // than a beep cut off mid-air.
    const peak = master * tone.gain;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/** Short buzz. Silently ignored where the API is missing (all desktops, iOS). */
export function vibrate(pattern: number | number[] = 40): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when the page is not visible; nothing to recover.
  }
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}
