export class SynthEngine {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.activeVoices = new Map();
    this.maxPolyphony = 8;
    
    this.vibratoAmount = 0.2;
    this.vibratoRate = 2;
    this.harmonicity = 2.02;
    
    this.ampEnv = { a: 0.1, d: 0.3, s: 0.8, r: 0.3 }; // Faster release (was 0.5)
    this.filterEnv = { a: 0.1, d: 0.3, s: 0.6, r: 0.5 }; // Faster release (was 1)
    this.envFreq = 4000;
    this.cutoffFreq = 1;
    
    this.voice0Volume = -22;
    this.voice1Volume = -28;
    
    this.chorusNode = this.createChorus();
    this.output = this.audioContext.createGain();
    this.chorusNode.connect(this.output);
  }
  
  connect(destination) {
    this.output.connect(destination);
  }
  
  createChorus() {
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    
    wetGain.gain.value = 0.1;
    dryGain.gain.value = 0.9;
    
    for (let i = 0; i < 3; i++) {
      const delay = this.audioContext.createDelay();
      delay.delayTime.value = 0.02 + (i * 0.01);
      
      const lfo = this.audioContext.createOscillator();
      lfo.frequency.value = 1 + (i * 0.5);
      
      const lfoGain = this.audioContext.createGain();
      lfoGain.gain.value = 0.002;
      
      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      
      input.connect(delay);
      delay.connect(wetGain);
      
      lfo.start();
    }
    
    input.connect(dryGain);
    wetGain.connect(output);
    dryGain.connect(output);
    
    output.input = input;
    return output;
  }
  
  dbToGain(db) {
    return Math.pow(10, db / 20);
  }
  
  noteToFrequency(note) {
    const noteMap = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    const match = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      console.error('Invalid note format:', note);
      return 261.63;
    }

    const noteName = match[1];
    const octave = parseInt(match[2]);
    const noteNumber = noteMap[noteName];
    const midiNote = (octave + 1) * 12 + noteNumber;
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    return frequency;
  }
  
  createVoice(note, velocity = 1.0) {
    const now = this.audioContext.currentTime;
    const frequency = this.noteToFrequency(note);
    
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    
    osc1.type = 'square';
    osc2.type = 'sawtooth';
    
    osc1.frequency.value = frequency;
    osc2.frequency.value = frequency * this.harmonicity;
    
    const vibrato = this.audioContext.createOscillator();
    vibrato.frequency.value = this.vibratoRate;
    const vibratoGain = this.audioContext.createGain();
    vibratoGain.gain.value = frequency * this.vibratoAmount * 0.01;
    
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc1.frequency);
    vibratoGain.connect(osc2.frequency);
    
    const filter1 = this.audioContext.createBiquadFilter();
    const filter2 = this.audioContext.createBiquadFilter();
    
    filter1.type = 'lowpass';
    filter2.type = 'lowpass';
    filter1.Q.value = 0;
    filter2.Q.value = 0;
    
    filter1.frequency.value = this.cutoffFreq;
    filter2.frequency.value = this.cutoffFreq;
    
    const gain1 = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();
    
    gain1.gain.value = 0;
    gain2.gain.value = 0;
    
    osc1.connect(filter1);
    filter1.connect(gain1);
    
    osc2.connect(filter2);
    filter2.connect(gain2);
    
    const outputGain = this.audioContext.createGain();
    gain1.connect(outputGain);
    gain2.connect(outputGain);
    
    outputGain.connect(this.chorusNode.input);
    
    osc1.start(now);
    osc2.start(now);
    vibrato.start(now);
    
    const voice1Gain = this.dbToGain(this.voice0Volume) * velocity;
    const voice2Gain = this.dbToGain(this.voice1Volume) * velocity;
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(voice1Gain, now + this.ampEnv.a);
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(voice2Gain, now + this.ampEnv.a);
    
    const filterPeak = this.envFreq;
    
    filter1.frequency.setValueAtTime(this.cutoffFreq, now);
    filter1.frequency.linearRampToValueAtTime(filterPeak, now + this.filterEnv.a);
    
    filter2.frequency.setValueAtTime(this.cutoffFreq, now);
    filter2.frequency.linearRampToValueAtTime(filterPeak, now + this.filterEnv.a);
    
    return {
      osc1,
      osc2,
      vibrato,
      filter1,
      filter2,
      gain1,
      gain2,
      outputGain,
      frequency,
      startTime: now,
      baseVelocity: velocity,
      targetVelocity: velocity
    };
  }
  
  playNote(note, noteId, velocity = 1.0) {
    if (this.activeVoices.size >= this.maxPolyphony) {
      const oldestKey = this.activeVoices.keys().next().value;
      this.stopNote(oldestKey, true);
    }
    
    const voice = this.createVoice(note, velocity);
    this.activeVoices.set(noteId, voice);
    
    console.log('Synth playing:', note, 'velocity:', velocity.toFixed(2));
  }
  
  // Update velocity of playing note
  setVelocity(noteId, velocity) {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;
    
    const now = this.audioContext.currentTime;
    const rampTime = 0.15; // Smooth transitions
    
    voice.targetVelocity = velocity;
    
    const voice1Gain = this.dbToGain(this.voice0Volume) * velocity;
    const voice2Gain = this.dbToGain(this.voice1Volume) * velocity;
    
    // Use setTargetAtTime for smooth, natural ramping
    voice.gain1.gain.cancelScheduledValues(now);
    voice.gain1.gain.setValueAtTime(voice.gain1.gain.value, now);
    voice.gain1.gain.setTargetAtTime(voice1Gain, now, rampTime);
    
    voice.gain2.gain.cancelScheduledValues(now);
    voice.gain2.gain.setValueAtTime(voice.gain2.gain.value, now);
    voice.gain2.gain.setTargetAtTime(voice2Gain, now, rampTime);
    
    // Also modulate filter frequency with velocity
    const filterFreq = this.cutoffFreq + (this.envFreq * velocity * 0.5);
    voice.filter1.frequency.cancelScheduledValues(now);
    voice.filter1.frequency.setValueAtTime(voice.filter1.frequency.value, now);
    voice.filter1.frequency.setTargetAtTime(Math.max(filterFreq, 20), now, rampTime);
    
    voice.filter2.frequency.cancelScheduledValues(now);
    voice.filter2.frequency.setValueAtTime(voice.filter2.frequency.value, now);
    voice.filter2.frequency.setTargetAtTime(Math.max(filterFreq, 20), now, rampTime);
  }
  
  stopNote(noteId, immediate = false) {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;
    
    const now = this.audioContext.currentTime;
    const releaseTime = immediate ? 0.01 : this.ampEnv.r;
    const filterReleaseTime = immediate ? 0.01 : this.filterEnv.r;
    
    voice.gain1.gain.cancelScheduledValues(now);
    voice.gain1.gain.setValueAtTime(voice.gain1.gain.value, now);
    voice.gain1.gain.linearRampToValueAtTime(0, now + releaseTime);
    
    voice.gain2.gain.cancelScheduledValues(now);
    voice.gain2.gain.setValueAtTime(voice.gain2.gain.value, now);
    voice.gain2.gain.linearRampToValueAtTime(0, now + releaseTime);
    
    voice.filter1.frequency.cancelScheduledValues(now);
    voice.filter1.frequency.setValueAtTime(voice.filter1.frequency.value, now);
    voice.filter1.frequency.linearRampToValueAtTime(this.cutoffFreq, now + filterReleaseTime);
    
    voice.filter2.frequency.cancelScheduledValues(now);
    voice.filter2.frequency.setValueAtTime(voice.filter2.frequency.value, now);
    voice.filter2.frequency.linearRampToValueAtTime(this.cutoffFreq, now + filterReleaseTime);
    
    const stopTime = now + Math.max(releaseTime, filterReleaseTime);
    voice.osc1.stop(stopTime);
    voice.osc2.stop(stopTime);
    voice.vibrato.stop(stopTime);
    
    this.activeVoices.delete(noteId);
  }
  
  panic() {
    this.activeVoices.forEach((voice, noteId) => {
      this.stopNote(noteId, true);
    });
    this.activeVoices.clear();
  }
}