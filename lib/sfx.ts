"use client";

type SoundKind = "join" | "leave" | "mic" | "headphones" | "message";

const presets: Record<SoundKind, { frequency: number; secondFrequency?: number; duration: number; gain: number }> = {
  join: { frequency: 660, secondFrequency: 880, duration: 0.16, gain: 0.035 },
  leave: { frequency: 420, secondFrequency: 260, duration: 0.18, gain: 0.032 },
  mic: { frequency: 760, duration: 0.09, gain: 0.025 },
  headphones: { frequency: 520, secondFrequency: 620, duration: 0.12, gain: 0.028 },
  message: { frequency: 900, duration: 0.07, gain: 0.02 }
};

export function playRoomSound(kind: SoundKind) {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const preset = presets[kind];
  const context = new AudioContextClass();
  const gain = context.createGain();
  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(preset.frequency, context.currentTime);
  if (preset.secondFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(preset.secondFrequency, context.currentTime + preset.duration);
  }
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(preset.gain, context.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + preset.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + preset.duration);
  window.setTimeout(() => context.close().catch(() => undefined), (preset.duration + 0.05) * 1000);
}
