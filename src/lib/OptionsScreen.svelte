<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Available options
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octaves = [2, 3, 4, 5]; // Four octave options
  
  // Settings for each row
  let topRow = {
    note: 'C3',
    visible: true
  };
  
  let secondRow = {
    note: 'F3',
    visible: true
  };
  
  let thirdRow = {
    note: 'G3',
    visible: true
  };
  
  let bottomRow = {
    note: 'A3',
    visible: true
  };
    
  onMount(() => {
    loadSettings();
    window.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
  
  function loadSettings() {
    const saved = localStorage.getItem('bars-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.topRow) topRow = parsed.topRow;
        if (parsed.secondRow) secondRow = parsed.secondRow;
        if (parsed.thirdRow) thirdRow = parsed.thirdRow;
        if (parsed.bottomRow) bottomRow = parsed.bottomRow;
        console.log('Loaded settings:', parsed);
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }
  
  function saveSettings() {
    const settings = {
      topRow,
      secondRow,
      thirdRow,
      bottomRow,
    };
    localStorage.setItem('bars-settings', JSON.stringify(settings));
    console.log('Saved settings:', settings);
  }
  
  function handleSaveAndClose() {
    saveSettings();
    dispatch('updateSettings', {
      topRow,
      secondRow,
      thirdRow,
      bottomRow,
    });
    dispatch('close');
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Enter') {
      handleSaveAndClose();
    }
  }
  
  // Parse note string into note name and octave
  function parseNote(noteString) {
    const match = noteString.match(/^([A-G][#]?)(\d+)$/);
    if (match) {
      return { noteName: match[1], octave: parseInt(match[2]) };
    }
    return { noteName: 'C', octave: 3 };
  }
  
  // Combine note name and octave into note string
  function combineNote(noteName, octave) {
    return noteName + octave;
  }
  
  // Cycle functions
  function cycleNote(currentNote, direction) {
    const { noteName, octave } = parseNote(currentNote);
    const currentIndex = noteNames.indexOf(noteName);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = noteNames.length - 1;
    if (newIndex >= noteNames.length) newIndex = 0;
    return combineNote(noteNames[newIndex], octave);
  }
  
  function cycleOctave(currentNote, direction) {
    const { noteName, octave } = parseNote(currentNote);
    const currentIndex = octaves.indexOf(octave);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = octaves.length - 1;
    if (newIndex >= octaves.length) newIndex = 0;
    return combineNote(noteName, octaves[newIndex]);
  }
  
  // Get display values
  function getNoteName(noteString) {
    return parseNote(noteString).noteName;
  }
  
  function getOctave(noteString) {
    return parseNote(noteString).octave;
  }
</script>

<div class="options-screen">
  <div class="content">
       
    <div class="options-wrapper">
      
      <!-- TOP ROW -->
      <div class="row-section" style="background-color: rgb(230, 159, 0);">
        <div class="row-header">
          <h2>Top Row</h2>
          <label class="checkbox-container">
            <input type="checkbox" bind:checked={topRow.visible} />
            <span>Show</span>
          </label>
        </div>
        
        <div class="row-controls">
          <div class="control-row">
            <span class="label">Note:</span>
            <button class="arrow-btn" on:click={() => topRow.note = cycleNote(topRow.note, -1)}>◀</button>
            <span class="value">{getNoteName(topRow.note)}</span>
            <button class="arrow-btn" on:click={() => topRow.note = cycleNote(topRow.note, 1)}>▶</button>
          </div>
          
          <div class="control-row">
            <span class="label">Octave:</span>
            <button class="arrow-btn" on:click={() => topRow.note = cycleOctave(topRow.note, -1)}>◀</button>
            <span class="value">{getOctave(topRow.note)}</span>
            <button class="arrow-btn" on:click={() => topRow.note = cycleOctave(topRow.note, 1)}>▶</button>
          </div>
        </div>
      </div>
      
      <!-- SECOND ROW -->
      <div class="row-section" style="background-color: rgb(86, 180, 233);">
        <div class="row-header">
          <h2>Second Row</h2>
          <label class="checkbox-container">
            <input type="checkbox" bind:checked={secondRow.visible} />
            <span>Show</span>
          </label>
        </div>
        
        <div class="row-controls">
          <div class="control-row">
            <span class="label">Note:</span>
            <button class="arrow-btn" on:click={() => secondRow.note = cycleNote(secondRow.note, -1)}>◀</button>
            <span class="value">{getNoteName(secondRow.note)}</span>
            <button class="arrow-btn" on:click={() => secondRow.note = cycleNote(secondRow.note, 1)}>▶</button>
          </div>
          
          <div class="control-row">
            <span class="label">Octave:</span>
            <button class="arrow-btn" on:click={() => secondRow.note = cycleOctave(secondRow.note, -1)}>◀</button>
            <span class="value">{getOctave(secondRow.note)}</span>
            <button class="arrow-btn" on:click={() => secondRow.note = cycleOctave(secondRow.note, 1)}>▶</button>
          </div>
        </div>
      </div>
      
      <!-- THIRD ROW -->
      <div class="row-section" style="background-color: rgb(213, 94, 0);">
        <div class="row-header">
          <h2>Third Row</h2>
          <label class="checkbox-container">
            <input type="checkbox" bind:checked={thirdRow.visible} />
            <span>Show</span>
          </label>
        </div>
        
        <div class="row-controls">
          <div class="control-row">
            <span class="label">Note:</span>
            <button class="arrow-btn" on:click={() => thirdRow.note = cycleNote(thirdRow.note, -1)}>◀</button>
            <span class="value">{getNoteName(thirdRow.note)}</span>
            <button class="arrow-btn" on:click={() => thirdRow.note = cycleNote(thirdRow.note, 1)}>▶</button>
          </div>
          
          <div class="control-row">
            <span class="label">Octave:</span>
            <button class="arrow-btn" on:click={() => thirdRow.note = cycleOctave(thirdRow.note, -1)}>◀</button>
            <span class="value">{getOctave(thirdRow.note)}</span>
            <button class="arrow-btn" on:click={() => thirdRow.note = cycleOctave(thirdRow.note, 1)}>▶</button>
          </div>
        </div>
      </div>
      
      <!-- BOTTOM ROW -->
      <div class="row-section" style="background-color: rgb(0, 158, 115);">
        <div class="row-header">
          <h2>Bottom Row</h2>
        </div>
        
        <div class="row-controls">
          <div class="control-row">
            <span class="label">Note:</span>
            <button class="arrow-btn" on:click={() => bottomRow.note = cycleNote(bottomRow.note, -1)}>◀</button>
            <span class="value">{getNoteName(bottomRow.note)}</span>
            <button class="arrow-btn" on:click={() => bottomRow.note = cycleNote(bottomRow.note, 1)}>▶</button>
          </div>
          
          <div class="control-row">
            <span class="label">Octave:</span>
            <button class="arrow-btn" on:click={() => bottomRow.note = cycleOctave(bottomRow.note, -1)}>◀</button>
            <span class="value">{getOctave(bottomRow.note)}</span>
            <button class="arrow-btn" on:click={() => bottomRow.note = cycleOctave(bottomRow.note, 1)}>▶</button>
          </div>
        </div>
      </div>      
    </div>
    
    <button class="save-button" on:click={handleSaveAndClose}>
      Save & Close
    </button>
  </div>
</div>

<style>
  .options-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 1rem;
    box-sizing: border-box;
    z-index: 9999;
    overflow-y: auto;
  }
  
  .content {
    max-width: 600px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }
  
  .options-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .row-section {
    background-color: #f5f5f5;
    border-radius: 12px;
    padding: 1rem;
    border: 2px solid #ddd;
  }
  
  .row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #ddd;
  }
  
  h2 {
    font-size: 1.2rem;
    margin: 0;
    color: #333;
    font-weight: 600;
  }
  
  .checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
  }

  .checkbox-container span {
    color: #333; 
  }
    
  .checkbox-container input {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
  
  .row-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .control-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  
  .label {
    font-weight: 600;
    color: #555;
    min-width: 60px;
    text-align: left;
  }
  
  .arrow-btn {
    background-color: #06C0F0;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 40px;
  }
  
  .arrow-btn:hover {
    background-color: #05A8D6;
    transform: scale(1.05);
  }
  
  .arrow-btn:active {
    transform: scale(0.95);
  }
  
  .value {
    font-weight: 600;
    font-size: 1.1rem;
    color: #333;
    min-width: 60px;
    text-align: center;
  }
  
  .save-button {
    background-color: #06C0F0;
    color: white;
    border: none;
    padding: 1rem 3rem;
    font-size: 1.2rem;
    font-weight: 600;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(6, 192, 240, 0.3);
    margin-top: 0.5rem;
  }
  
  .save-button:hover {
    background-color: #05A8D6;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(6, 192, 240, 0.4);
  }
  
  .save-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(6, 192, 240, 0.3);
  }

  /* Tablet Portrait (iPad) */
  @media (min-width: 481px) and (max-width: 1024px) and (orientation: portrait) {
    .options-screen {
      padding: 1rem 1.5rem;
    }
    
    .options-wrapper {
      gap: 1rem;
    }
    
    .row-section {
      padding: 0.75rem;
    }
    
    .save-button {
      margin-top: 1rem;
      max-width: 50%;
      align-self: center;
    }
  }
  
/* Mobile Portrait */
@media (max-width: 480px) {
  .options-screen {
    padding: 0.4rem;
    justify-content: flex-start;
  }
  
  .content {
    gap: 0.3rem;
    padding-top: 0;
  }
  
  h2 {
    font-size: 0.95rem;
  }
  
  .options-wrapper {
    gap: 0.5rem;
  }
  
  .row-section {
    padding: 0.5rem;
  }
  
  .row-header {
    margin-bottom: 0.5rem;
    padding-bottom: 0.3rem;
  }
  
  .row-controls {
    gap: 0.35rem;
  }
  
  .label {
    font-size: 0.85rem;
    min-width: 45px;
  }
  
  .value {
    font-size: 0.95rem;
    min-width: 45px;
  }
  
  .arrow-btn {
    padding: 0.35rem 0.55rem;
    font-size: 0.85rem;
    min-width: 32px;
  }
  
  .save-button {
    padding: 0.7rem 1.8rem;
    font-size: 0.95rem;
    margin-top: 0.3rem;
  }
}

/* Landscape mode - iPad and larger */
@media (orientation: landscape) and (min-height: 451px) and (max-height: 768px) {
  .options-screen {
    padding: 0.75rem 1rem;
    justify-content: flex-start;
    overflow-y: auto;
  }
  
  .content {
    max-width: 100%;
    gap: 0.5rem;
  }
  
  .options-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  
  .row-section {
    padding: 0.75rem;
  }
  
  .row-header {
    margin-bottom: 0.5rem;
    padding-bottom: 0.3rem;
  }
  
  h2 {
    font-size: 1rem;
  }
  
  .checkbox-container {
    font-size: 0.9rem;
  }
  
  .row-controls {
    gap: 0.5rem;
  }
  
  .label {
    font-size: 0.85rem;
    min-width: 45px;
  }
  
  .value {
    font-size: 0.95rem;
    min-width: 45px;
  }
  
  .arrow-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
    min-width: 32px;
  }
  
  .save-button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    margin-top: 0.5rem;
  }
}

/* Very short landscape (iPhone landscape) - Button to the right */
@media (orientation: landscape) and (max-height: 450px) {
  .options-screen {
    padding: 0.5rem 0.75rem;
    overflow-y: auto;
  }
  
  .content {
    max-width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
    align-items: start;
  }
  
  .options-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  .save-button {
    grid-column: 2;
    grid-row: 1;
    padding: 2rem 1rem;
    font-size: 0.9rem;
    margin: 0;
    align-self: center;
    height: fit-content;
    writing-mode: horizontal-tb;
  }
  
  .row-section {
    padding: 0.5rem;
  }
  
  .row-header {
    margin-bottom: 0.4rem;
    padding-bottom: 0.25rem;
  }
  
  h2 {
    font-size: 0.85rem;
  }
  
  .checkbox-container {
    font-size: 0.75rem;
  }
  
  .checkbox-container input {
    width: 14px;
    height: 14px;
  }
  
  .row-controls {
    gap: 0.35rem;
  }
  
  .control-row {
    gap: 0.25rem;
  }
  
  .label {
    font-size: 0.75rem;
    min-width: 38px;
  }
  
  .value {
    font-size: 0.8rem;
    min-width: 38px;
  }
  
  .arrow-btn {
    padding: 0.3rem 0.45rem;
    font-size: 0.75rem;
    min-width: 28px;
  }
}
  
</style>