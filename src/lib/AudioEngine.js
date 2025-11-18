import { SynthEngine } from './SynthEngine.js';

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.audioBuffer = null;
    this.activeNotes = new Map();
    this.isInitialized = false;
    this.masterGain = null;
    this.synthEngine = null;
  }

  async init() {
    if (this.isInitialized) {
      console.log('AudioEngine already initialized');
      return;
    }

    try {
      const audioContextOptions = {
        latencyHint: 'playback',
        sampleRate: 24000
      };

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)(audioContextOptions);
     
      console.log('AudioContext created, state:', this.audioContext.state);

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.2;
      
      this.reverb = this.createReverb();
      
      // Create synth engine
      this.synthEngine = new SynthEngine(this.audioContext);
      this.synthEngine.connect(this.reverb.input);
      
      this.setReverbEnabled(true);

      // Still load sample for pluck mode (we'll implement later)
      await this.loadSample('/sounds/Harp-C4-mono.mp3');

      this.isInitialized = true;
      console.log('AudioEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      throw error;
    }
  }

  createReverb() {
    const reverbGain = this.audioContext.createGain();
    reverbGain.gain.value = 0.3;
    
    const delays = [];
    const gains = [];
    
    const delayTimes = [0.023, 0.037, 0.053, 0.067];
    const feedbackAmount = 0.5;
    
    delayTimes.forEach((time, i) => {
      const delay = this.audioContext.createDelay();
      delay.delayTime.value = time;
      
      const gain = this.audioContext.createGain();
      gain.gain.value = 0.7 / delayTimes.length;
      
      const feedback = this.audioContext.createGain();
      feedback.gain.value = feedbackAmount;
      
      delay.connect(gain);
      gain.connect(feedback);
      feedback.connect(delay);
      
      delays.push(delay);
      gains.push(gain);
    });
    
    const dryGain = this.audioContext.createGain();
    dryGain.gain.value = 0.7;
    
    const wetGain = this.audioContext.createGain();
    wetGain.gain.value = 0.3;
    
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();
    
    input.connect(dryGain);
    dryGain.connect(output);
    
    delays.forEach((delay, i) => {
      input.connect(delays[i]);
      gains[i].connect(wetGain);
    });
    wetGain.connect(output);
    
    output.input = input;
    
    return output;
  }

  setReverbEnabled(enabled) {
    if (!this.audioContext || !this.masterGain) {
      console.warn('AudioEngine not initialized');
      return;
    }
    
    this.masterGain.disconnect();
    
    if (enabled && this.reverb) {
      this.masterGain.connect(this.reverb.input);
      this.reverb.connect(this.audioContext.destination);
      console.log('Reverb enabled');
    } else {
      this.masterGain.connect(this.audioContext.destination);
      console.log('Reverb disabled');
    }
  }

  async loadSample(url) {
    try {
      console.log('Loading sample from:', url);
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      this.audioBuffer = await new Promise((resolve, reject) => {
        this.audioContext.decodeAudioData(
          arrayBuffer,
          (decodedBuffer) => {
            resolve(decodedBuffer);
          },
          (error) => {
            reject(error);
          }
        );
      });
      
      console.log('Sample loaded successfully, duration:', this.audioBuffer.duration);
    } catch (error) {
      console.error('Failed to load sample:', error);
      throw error;
    }
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

  getPlaybackRate(targetNote) {
    const c4Frequency = 261.63;
    const targetFrequency = this.noteToFrequency(targetNote);
    return targetFrequency / c4Frequency;
  }

  // Use synth for bowed sound
  playNote(note, stringId = null, velocity = 1.0) {
    if (!this.isInitialized || !this.synthEngine) {
      console.warn('AudioEngine not initialized');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const key = stringId || note;
    this.synthEngine.playNote(note, key, velocity);
  }

  setVelocity(stringId, velocity) {
    if (this.synthEngine) {
      this.synthEngine.setVelocity(stringId, velocity);
    }
  }

  stopNote(note, stringId = null) {
    const key = stringId || note;
    if (this.synthEngine) {
      this.synthEngine.stopNote(key);
    }
  }

  panic() {
    console.log('Panic: stopping all notes');
    if (this.synthEngine) {
      this.synthEngine.panic();
    }
    this.activeNotes.clear();
  }

  cleanupOrphanedOscillators() {
    // No-op
  }

  get activeOscillators() {
    return this.activeNotes;
  }
}