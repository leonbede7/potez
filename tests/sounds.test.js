import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundPlayer } from '../src/sounds.js';

function audioHarness() {
  const events = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime: (v, t) => events.push(['value', v, t]),
    exponentialRampToValueAtTime: (v, t) => events.push(['ramp', v, t]),
  });
  const node = () => ({
    connect() {},
    start(t) {
      events.push(['start', t]);
    },
    stop(t) {
      events.push(['stop', t]);
    },
  });
  class Audio {
    constructor() {
      events.push(['context']);
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.state = 'running';
      this.destination = {};
    }
    createOscillator() {
      events.push(['oscillator']);
      return { ...node(), frequency: parameter() };
    }
    createGain() {
      return { ...node(), gain: parameter() };
    }
    createBuffer(channels, length) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      events.push(['noise']);
      return node();
    }
    createBiquadFilter() {
      return { ...node(), frequency: parameter(), Q: { value: 0 } };
    }
  }
  return { Audio, events };
}
test('muted and zero-volume sounds do not create an audio context', () => {
  const { Audio, events } = audioHarness();
  let settings = { sound: false, volume: 35 };
  const sound = createSoundPlayer(() => settings, Audio);
  sound.play('move');
  settings = { sound: true, volume: 0 };
  sound.play('complete');
  assert.deepEqual(events, []);
});
test('wood captures have two physical taps and completion has a quiet four-tone motif', () => {
  const { Audio, events } = audioHarness();
  const sound = createSoundPlayer(() => ({ sound: true, volume: 35, soundStyle: 'wood' }), Audio);
  sound.play('capture');
  assert.equal(events.filter((e) => e[0] === 'noise').length, 2);
  const start = events.length;
  sound.play('complete');
  assert.equal(events.slice(start).filter((e) => e[0] === 'oscillator').length, 4);
  assert.equal(events.filter((e) => e[0] === 'context').length, 1);
});
test('the preview button can play a muted style while optional audio failures stay contained', () => {
  const { Audio, events } = audioHarness();
  createSoundPlayer(() => ({ sound: false, volume: 30, soundStyle: 'soft' }), Audio).play(
    'move',
    true,
  );
  assert.equal(events.filter((e) => e[0] === 'oscillator').length, 1);
  class BlockedAudio {
    constructor() {
      throw Error('Blocked');
    }
  }
  assert.doesNotThrow(() =>
    createSoundPlayer(() => ({ sound: true, volume: 30 }), BlockedAudio).play('error'),
  );
});
