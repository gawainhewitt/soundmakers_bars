import { SynthEngine } from './SynthEngine.js';

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.audioBuffers = new Map(); // Store multiple samples
    this.activeNotes = new Map();
    this.isInitialized = false;
    this.masterGain = null;
    this.synthEngine = null;
    this.mode = 'bow'; // 'bow' or 'pluck'
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
      this.masterGain.gain.value = 0.9; // Slightly higher for samples
      
      this.reverb = this.createReverb();
      
      // Create synth engine for bow mode
      this.synthEngine = new SynthEngine(this.audioContext);
      this.synthEngine.connect(this.reverb.input);
      
      this.setReverbEnabled(true);

      // Load cello samples for pluck mode
      await this.loadSamples();

      this.isInitialized = true;
      console.log('AudioEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      throw error;
    }
  }

  async loadSamples() {
    const samples = {
      'B2': '/sounds/42242__timkahn__c_s-cello-b3.flac',
      'B4': '/sounds/42244__timkahn__c_s-cello-b5.flac'
    };

    const loadPromises = Object.entries(samples).map(async ([note, url]) => {
      try {
        console.log('Loading sample:', note, 'from:', url);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        const buffer = await new Promise((resolve, reject) => {
          this.audioContext.decodeAudioData(
            arrayBuffer,
            (decodedBuffer) => resolve(decodedBuffer),
            (error) => reject(error)
          );
        });
        
        this.audioBuffers.set(note, buffer);
        console.log('Sample loaded:', note);
      } catch (error) {
        console.error('Failed to load sample:', note, error);
      }
    });

    await Promise.all(loadPromises);
    console.log('All samples loaded');
  }

  // Find the closest sample to use for a given note
  getClosestSample(targetNote) {
    const targetFreq = this.noteToFrequency(targetNote);
    const sampleFreqs = new Map([
      ['B2', this.noteToFrequency('B2')],
      ['B4', this.noteToFrequency('B4')]
    ]);

    let closestSample = 'B2';
    let smallestDiff = Infinity;

    sampleFreqs.forEach((freq, note) => {
      const diff = Math.abs(Math.log2(targetFreq / freq));
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestSample = note;
      }
    });

    return closestSample;
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
    dryGain.gain.value = 0.5; // More wet for cello samples
    
    const wetGain = this.audioContext.createGain();
    wetGain.gain.value = 0.5;
    
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

  getPlaybackRate(targetNote, sourceNote) {
    const targetFreq = this.noteToFrequency(targetNote);
    const sourceFreq = this.noteToFrequency(sourceNote);
    return targetFreq / sourceFreq;
  }

  setMode(mode) {
    if (mode !== 'bow' && mode !== 'pluck') {
      console.error('Invalid mode:', mode);
      return;
    }
    this.mode = mode;
    console.log('Audio mode set to:', mode);
    
    // Stop all playing notes when switching modes
    this.panic();
  }

  playNote(note, stringId = null, velocity = 1.0) {
    if (!this.isInitialized) {
      console.warn('AudioEngine not initialized');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const key = stringId || note;

    if (this.mode === 'bow') {
      // Use synth engine
      if (this.synthEngine) {
        this.synthEngine.playNote(note, key, velocity);
      }
    } else {
      // Use sample playback
      this.playSample(note, key, velocity);
    }
  }

  playSample(note, noteId, velocity = 1.0) {
    // Find closest sample
    const sampleNote = this.getClosestSample(note);
    const buffer = this.audioBuffers.get(sampleNote);
    
    if (!buffer) {
      console.warn('Sample not loaded:', sampleNote);
      return;
    }

    // Stop any existing note with this ID
    const existing = this.activeNotes.get(noteId);
    if (existing) {
      try {
        existing.source.stop();
      } catch (e) {
        // Already stopped
      }
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const playbackRate = this.getPlaybackRate(note, sampleNote);
    source.playbackRate.value = playbackRate;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = velocity * 0.8; // Scale down a bit

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    source.start(0);

    this.activeNotes.set(noteId, { source, gainNode, startTime: now });

    source.onended = () => {
      this.activeNotes.delete(noteId);
    };

    console.log('Playing sample:', note, 'using', sampleNote, 'at rate:', playbackRate.toFixed(3));
  }

  setVelocity(stringId, velocity) {
    if (this.mode === 'bow' && this.synthEngine) {
      this.synthEngine.setVelocity(stringId, velocity);
    }
    // In pluck mode, velocity changes don't affect already-playing samples
  }

  stopNote(note, stringId = null) {
    const key = stringId || note;
    
    if (this.mode === 'bow' && this.synthEngine) {
      this.synthEngine.stopNote(key);
    } else {
      // In pluck mode, let the sample play out naturally
      // Don't stop it early
    }
  }

  panic() {
    console.log('Panic: stopping all notes');
    if (this.synthEngine) {
      this.synthEngine.panic();
    }
    this.activeNotes.forEach((noteData) => {
      try {
        noteData.source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.activeNotes.clear();
  }

  cleanupOrphanedOscillators() {
    // No-op
  }

  get activeOscillators() {
    return this.activeNotes;
  }
}