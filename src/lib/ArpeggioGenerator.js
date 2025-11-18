export class ArpeggioGenerator {
  constructor() {
    // Semitone intervals from root for each chord type
    this.chordIntervals = {
      'major': [0, 4, 7],           // Root, Major 3rd, Perfect 5th
      'minor': [0, 3, 7],           // Root, Minor 3rd, Perfect 5th
      'dom7': [0, 4, 7, 10],        // Root, Major 3rd, Perfect 5th, Minor 7th
      'maj7': [0, 4, 7, 11],        // Root, Major 3rd, Perfect 5th, Major 7th
      'min7': [0, 3, 7, 10]         // Root, Minor 3rd, Perfect 5th, Minor 7th
    };

    // Note names in chromatic order
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  // Convert note name to MIDI number
  noteToMidi(noteName, octave) {
    const noteIndex = this.noteNames.indexOf(noteName);
    if (noteIndex === -1) {
      console.error('Invalid note name:', noteName);
      return 60; // Default to C4
    }
    return (octave + 1) * 12 + noteIndex;
  }

  // Convert MIDI number to note name with octave
  midiToNote(midiNumber) {
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = midiNumber % 12;
    return this.noteNames[noteIndex] + octave;
  }

  // Generate an arpeggio spanning multiple octaves
  generateArpeggio(root, chordType, startOctave, numNotes = 10) {
    const intervals = this.chordIntervals[chordType];
    if (!intervals) {
      console.error('Invalid chord type:', chordType);
      return [];
    }

    const rootMidi = this.noteToMidi(root, startOctave);
    const arpeggio = [];
    
    let currentOctaveOffset = 0;
    let intervalIndex = 0;

    for (let i = 0; i < numNotes; i++) {
      // Get the current interval
      const interval = intervals[intervalIndex];
      
      // Calculate MIDI note number
      const midiNote = rootMidi + currentOctaveOffset + interval;
      
      // Convert to note name
      arpeggio.push(this.midiToNote(midiNote));
      
      // Move to next interval
      intervalIndex++;
      
      // If we've used all intervals, go to next octave and reset
      if (intervalIndex >= intervals.length) {
        intervalIndex = 0;
        currentOctaveOffset += 12; // Move up one octave
      }
    }

    return arpeggio;
  }
}