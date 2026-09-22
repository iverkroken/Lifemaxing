export const sounds = ['Soft Alarm', 'Focus Bell', 'Gentle Digital', 'Rising Chime', 'Ambient Alert', 'Warm Gong', 'Minimal Alarm']
const legacySounds = { 'Soft Chime': 'Rising Chime', Bell: 'Focus Bell', Digital: 'Gentle Digital', Ambient: 'Ambient Alert', Minimal: 'Minimal Alarm' }
export const normalizeSound = sound => legacySounds[sound] || (sounds.includes(sound) ? sound : 'Soft Alarm')
// Frequency motifs, spacing, decay and a quiet overtone give each alert its identity.
const profiles = {
  'Soft Alarm': { notes: [440, 554.37, 659.25], step: 0.28, decay: 0.8, repeats: 2, harmonic: 2, mix: 0.12 },
  'Focus Bell': { notes: [523.25, 783.99, 523.25], step: 0.45, decay: 1.6, repeats: 1, harmonic: 2.76, mix: 0.16 },
  'Gentle Digital': { notes: [587.33, 739.99, 587.33], step: 0.2, decay: 0.35, repeats: 2, harmonic: 2, mix: 0.08 },
  'Rising Chime': { notes: [523.25, 659.25, 783.99], step: 0.32, decay: 1.1, repeats: 2, harmonic: 2, mix: 0.12 },
  'Ambient Alert': { notes: [261.63, 329.63, 392], step: 0.5, decay: 2, repeats: 1, harmonic: 1.5, mix: 0.2, attack: 0.12 },
  'Warm Gong': { notes: [196, 293.66, 196], step: 0.65, decay: 2, repeats: 1, harmonic: 2.4, mix: 0.18 },
  'Minimal Alarm': { notes: [493.88, 493.88, 659.25], step: 0.3, decay: 0.45, repeats: 1, harmonic: 2, mix: 0.06 },
}
export function createFocusAudio() {
  let context
  const voices = new Set()
  const initialize = async () => {
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext
      if (!Audio) return false
      context ||= new Audio()
      if (context.state === 'suspended') await context.resume()
      return context.state === 'running'
    } catch { return false }
  }
  const play = async (preferences, phase = 'Timer', preview = false) => {
    if (preferences.volume <= 0) return false
    if (!preview && (!preferences.soundEnabled || (phase === 'Focus' && !preferences.focusSound) || (phase === 'Break' && !preferences.breakSound))) return false
    if (!(await initialize())) return false
    const profile = profiles[normalizeSound(preferences.sound)]
    const volume = Math.min(1, Math.max(0, Number(preferences.volume) / 100))
    if (!Number.isFinite(volume)) return false
    // Repeated previews replace the previous signal, preventing stacked loudness.
    if (preview) for (const voice of voices) { voice.stop(); voice.onended() }
    for (let repeat = 0; repeat < profile.repeats; repeat++) profile.notes.forEach((frequency, index) => {
      for (const [ratio, weight] of [[1, 1 - profile.mix], [profile.harmonic, profile.mix]]) {
        const oscillator = context.createOscillator(), gain = context.createGain()
        const start = context.currentTime + index * profile.step + repeat * (profile.notes.length * profile.step + profile.decay + 0.2)
        oscillator.type = 'sine'; oscillator.frequency.value = frequency * ratio
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(volume * 0.45 * weight / profile.notes.length, start + (profile.attack || 0.035))
        gain.gain.exponentialRampToValueAtTime(0.0001, start + profile.decay)
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + profile.decay + 0.05)
        voices.add(oscillator)
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(oscillator) }
      }
    })
    return true
  }
  return { initialize, play, close: () => { for (const voice of voices) { voice.stop(); voice.onended() } context?.close().catch(() => {}); context = null } }
}
