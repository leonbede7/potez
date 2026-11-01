// Small procedural sound palette. No downloads, music, or background playback.
export function createSoundPlayer(
  getSettings,
  AudioConstructor = globalThis.AudioContext || globalThis.webkitAudioContext,
) {
  let context, noise;
  function tone(frequency, start, duration, volume, type = 'sine', endFrequency = frequency) {
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }
  function tap(start, volume, low = false) {
    if (!noise) {
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.075), context.sampleRate);
      const channel = noise.getChannelData(0);
      for (let i = 0; i < channel.length; i++)
        channel[i] = (Math.random() * 2 - 1) * Math.exp((-i / channel.length) * 8);
    }
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = low ? 520 : 1350;
    filter.Q.value = 1.3;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(start);
    source.stop(start + 0.08);
    tone(low ? 145 : 230, start, 0.07, volume * 0.22, 'sine', 70);
  }
  function play(event = 'move', force = false) {
    const settings = getSettings();
    if ((!settings.sound && !force) || !AudioConstructor) return;
    const volume = Math.max(0, Math.min(1, Number(settings.volume ?? 35) / 100));
    if (!volume) return;
    try {
      context ||= new AudioConstructor();
      if (context.state === 'suspended') context.resume().catch(() => {});
      const now = context.currentTime + 0.005,
        v = volume * 0.2;
      if (event === 'error') {
        tone(180, now, 0.15, v * 0.4, 'sine', 115);
        return;
      }
      if (event === 'hint') {
        tone(660, now, 0.18, v * 0.3);
        tone(880, now + 0.055, 0.15, v * 0.2);
        return;
      }
      if (event === 'complete' || event === 'goal') {
        [523.25, 659.25, 783.99, event === 'goal' ? 1046.5 : 987.77].forEach((f, i) =>
          tone(f, now + i * 0.065, 0.3, v * 0.4),
        );
        return;
      }
      if (settings.soundStyle === 'wood') {
        tap(now, volume * 0.48, event === 'capture');
        if (event === 'capture') tap(now + 0.035, volume * 0.3, true);
      } else if (settings.soundStyle === 'arcade') {
        tone(
          event === 'capture' ? 330 : 660,
          now,
          0.065,
          v * 0.3,
          'triangle',
          event === 'capture' ? 220 : 440,
        );
      } else {
        tone(
          event === 'capture' ? 300 : 480,
          now,
          0.11,
          v * 0.4,
          'sine',
          event === 'capture' ? 160 : 320,
        );
      }
    } catch {
      /* Sound is optional; training remains available if audio is blocked. */
    }
  }
  return { play };
}
