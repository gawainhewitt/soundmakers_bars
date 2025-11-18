<script>
  import { onMount, onDestroy } from 'svelte';
  import Row from './Row.svelte';
  
  let { audioEngine, settings } = $props();
  
  // Define the four rows with their colors and notes
  let rows = $derived(settings ? [
    { 
      id: 0, 
      color: 'rgb(230, 159, 0)',
      note: settings.topRow?.note || 'C4',
      visible: settings.topRow?.visible ?? true
    },
    { 
      id: 1, 
      color: 'rgb(86, 180, 233)',
      note: settings.secondRow?.note || 'F4',
      visible: settings.secondRow?.visible ?? true
    },
    { 
      id: 2, 
      color: 'rgb(213, 94, 0)',
      note: settings.thirdRow?.note || 'G4',
      visible: settings.thirdRow?.visible ?? true
    },
    { 
      id: 3, 
      color: 'rgb(0, 158, 115)',
      note: settings.bottomRow?.note || 'A4',
      visible: settings.bottomRow?.visible ?? true
    }
  ].filter(row => row.visible) : []);
  
  // Map keyboard keys to row indices
  let keyMap = $derived.by(() => {
    const map = {};
    const keyRows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
    ];
    
    rows.forEach((row, rowIndex) => {
      const keys = keyRows[rowIndex] || [];
      keys.forEach((key) => {
        map[key] = rowIndex;
      });
    });
    
    return map;
  });
  
  // Track which keys are currently held down
  let heldKeys = $state(new Set());
  
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    
    if (audioEngine) {
      audioEngine.panic();
    }
  });
  
  function handleVisibilityChange() {
    if (document.hidden && audioEngine) {
      console.log('Page hidden - stopping all notes');
      audioEngine.panic();
      heldKeys.clear();
    }
  }

  function handleWindowBlur() {
    if (audioEngine) {
      console.log('Window blur - stopping all notes');
      audioEngine.panic();
      heldKeys.clear();
    }
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      if (audioEngine) {
        audioEngine.panic();
        heldKeys.clear();
      }
      return;
    }
    
    const key = e.key.toLowerCase();
    if (keyMap.hasOwnProperty(key)) {
      if (heldKeys.has(key)) return;
      heldKeys.add(key);
      
      const rowIndex = keyMap[key];
      const row = rows[rowIndex];
      
      if (audioEngine && row) {
        audioEngine.playNote(row.note, `row-${rowIndex}`);
        console.log('Key pressed:', key, '→', row.note);
      }
    }
  }

  function handleKeyup(e) {
    const key = e.key.toLowerCase();
    if (keyMap.hasOwnProperty(key)) {
      heldKeys.delete(key);
    }
  }
</script>

<div class="grid-container">
  {#each rows as row, rowIndex}
    <Row
      color={row.color}
      note={row.note}
      rowIndex={rowIndex}
      {audioEngine}
    />
  {/each}
</div>

<style>
  .grid-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
</style>