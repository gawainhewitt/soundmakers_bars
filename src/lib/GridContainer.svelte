<script>
  import { onMount, onDestroy } from 'svelte';
  import Row from './Row.svelte';
  
  let { audioEngine, playMode, settings } = $props();
  
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
  
  let heldKeys = $state(new Set());
  
  // Track keyboard bowing for each row
  let keyboardBowing = $state(new Map()); // Map<rowIndex, {lastKeyTime, lastKey, velocity, isPlaying}>
  let rowVisuals = $state(new Map()); // Map<rowIndex, {isActive, volume}>
  
  const KEYBOARD_BOW_DECAY = 0.85; // Faster decay
  const KEYBOARD_BOW_SPEED_MULTIPLIER = 0.22; // How much each keypress adds to velocity
  const MIN_KEYBOARD_VELOCITY = 0.7; // minimum velocity for single keypress
  const KEYBOARD_NOTE_TIMEOUT = 200; // Stop note if no key pressed within this time (ms)
  let keyboardAnimationFrame = null;
  
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    
    startKeyboardTracking();
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    
    if (keyboardAnimationFrame) {
      cancelAnimationFrame(keyboardAnimationFrame);
    }
    
    if (audioEngine) {
      audioEngine.panic();
    }
  });
  
  function handleVisibilityChange() {
    if (document.hidden && audioEngine) {
      console.log('Page hidden - stopping all notes');
      audioEngine.panic();
      heldKeys.clear();
      keyboardBowing.clear();
    }
  }

  function handleWindowBlur() {
    if (audioEngine) {
      console.log('Window blur - stopping all notes');
      audioEngine.panic();
      heldKeys.clear();
      keyboardBowing.clear();
    }
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      if (audioEngine) {
        audioEngine.panic();
        heldKeys.clear();
        keyboardBowing.clear();
      }
      return;
    }
    
    const key = e.key.toLowerCase();
    if (keyMap.hasOwnProperty(key)) {
      if (heldKeys.has(key)) return; // Key already held
      heldKeys.add(key);
      
      const rowIndex = keyMap[key];
      const row = rows[rowIndex];
      
      if (!row) return;
      
      if (playMode === 'pluck') {
        // Pluck mode: simple trigger
        if (audioEngine) {
          audioEngine.playNote(row.note, `row-${rowIndex}`, 0.8);
        }
        
        // Visual feedback
        triggerRowVisual(rowIndex, 0.8);
      } else {
        // Bow mode: track "bowing" motion
        handleKeyboardBow(rowIndex, key, row.note);
      }
    }
  }
  
  function handleKeyboardBow(rowIndex, key, note) {
    const now = Date.now();
    const bowData = keyboardBowing.get(rowIndex);
    
    let velocity = MIN_KEYBOARD_VELOCITY;
    
    if (bowData) {
      const timeSinceLastKey = now - bowData.lastKeyTime;
      
      // If this is a different key than last time (alternating keys)
      // and it's within a reasonable time window, increase velocity
      if (bowData.lastKey !== key && timeSinceLastKey < 500) {
        // Calculate speed: shorter time = faster = louder
        // Time between 50-300ms gives good velocity increase
        const normalizedTime = Math.max(50, Math.min(timeSinceLastKey, 300));
        const speedFactor = (300 - normalizedTime) / 250; // 0-1 range
        
        // Build velocity with each alternation
        velocity = Math.min(bowData.velocity + (speedFactor * KEYBOARD_BOW_SPEED_MULTIPLIER) + 0.1, 1.0);
        
        console.log('Alternating! Time:', timeSinceLastKey, 'Speed factor:', speedFactor.toFixed(2), 'Velocity:', velocity.toFixed(2));
      } else {
        // Same key or too slow - start fresh but keep some momentum
        velocity = Math.max(MIN_KEYBOARD_VELOCITY, bowData.velocity * 0.5);
      }
    }
    
    // Update bow data
    keyboardBowing.set(rowIndex, {
      lastKeyTime: now,
      lastKey: key,
      velocity: velocity,
      isPlaying: true
    });
    
    // Play or update note
    if (audioEngine) {
      if (!bowData || !bowData.isPlaying) {
        audioEngine.playNote(note, `row-${rowIndex}`, velocity);
      } else {
        audioEngine.setVelocity(`row-${rowIndex}`, velocity);
      }
    }
    
    // Update visual
    triggerRowVisual(rowIndex, velocity);
  }
  
  function triggerRowVisual(rowIndex, volume) {
    rowVisuals.set(rowIndex, {
      isActive: true,
      volume: volume,
      timestamp: Date.now()
    });
    
    // Create new Map to trigger reactivity
    rowVisuals = new Map(rowVisuals);
  }
  
  function startKeyboardTracking() {
    const update = () => {
      const now = Date.now();
      let needsUpdate = false;
      
      // Decay keyboard bowing velocities and stop hanging notes
      keyboardBowing.forEach((bowData, rowIndex) => {
        const timeSinceLastKey = now - bowData.lastKeyTime;
        
        // Stop note if no key pressed recently
        if (timeSinceLastKey > KEYBOARD_NOTE_TIMEOUT && bowData.isPlaying) {
          if (audioEngine) {
            audioEngine.stopNote(`row-${rowIndex}`);
          }
          bowData.isPlaying = false;
          bowData.velocity *= KEYBOARD_BOW_DECAY;
          needsUpdate = true;
        }
        
        // Decay velocity when not actively pressing keys
        if (timeSinceLastKey > 50) {
          bowData.velocity *= KEYBOARD_BOW_DECAY;
          
          // Update audio with decaying velocity if still playing
          if (audioEngine && bowData.isPlaying && bowData.velocity > 0.05) {
            audioEngine.setVelocity(`row-${rowIndex}`, bowData.velocity);
          } else if (bowData.velocity <= 0.05) {
            // Clean up when velocity too low
            if (audioEngine && bowData.isPlaying) {
              audioEngine.stopNote(`row-${rowIndex}`);
            }
            keyboardBowing.delete(rowIndex);
          }
          
          needsUpdate = true;
        }
      });
      
      // Decay visual feedback
      rowVisuals.forEach((visual, rowIndex) => {
        const age = now - visual.timestamp;
        if (age > 200) { // Shorter visual timeout
          rowVisuals.delete(rowIndex);
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        keyboardBowing = new Map(keyboardBowing);
        rowVisuals = new Map(rowVisuals);
      }
      
      keyboardAnimationFrame = requestAnimationFrame(update);
    };
    
    keyboardAnimationFrame = requestAnimationFrame(update);
  }

  function handleKeyup(e) {
    const key = e.key.toLowerCase();
    if (keyMap.hasOwnProperty(key)) {
      heldKeys.delete(key);
    }
  }
  
  // Get visual state for a row
  function getRowVisual(rowIndex) {
    return rowVisuals.get(rowIndex) || { isActive: false, volume: 0 };
  }
</script>

<div class="grid-container">
  {#each rows as row, rowIndex}
    {@const visual = getRowVisual(rowIndex)}
    <Row
      color={row.color}
      note={row.note}
      rowIndex={rowIndex}
      {audioEngine}
      {playMode}
      keyboardActive={visual.isActive}
      keyboardVolume={visual.volume}
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
    border-radius: 20px;
    overflow: hidden;
  }
</style>