<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let color = 'rgb(230, 159, 0)';
  export let note = 'C4';
  export let rowIndex = 0;
  export let audioEngine = null;
  
  let element;
  let isTouching = false;
  let isPlaying = false;
  let lastX = null;
  let lastMoveTime = null;
  let currentVolume = 0;
  let recentMovements = []; // Track recent movement speeds
  let animationFrame = null;
  
  // Movement tracking
  const MOVEMENT_HISTORY_SIZE = 5; // Average over last N movements
  const VOLUME_SMOOTHING = 0.8; // How smoothly volume changes
  const SPEED_TO_VOLUME = 2; // Multiplier to convert speed to volume
  const MIN_VOLUME_THRESHOLD = 0.05;
  const MAX_VOLUME = 1.0;
  const DECAY_RATE = 0.88; // How quickly volume decays when not moving (faster decay)
  const RELEASE_MULTIPLIER = 0.7; // Extra decay when finger is lifted
  
  function handleMouseDown(e) {
    isTouching = true;
    lastX = e.clientX;
    lastMoveTime = Date.now();
    recentMovements = [];
    startTracking();
  }
  
  function handleMouseMove(e) {
    if (!isTouching) return;
    updateMovement(e.clientX);
  }
  
  function handleMouseUp() {
    stopInteraction();
  }
  
  function handleTouchStart(e) {
    e.preventDefault();
    isTouching = true;
    const touch = e.touches[0];
    lastX = touch.clientX;
    lastMoveTime = Date.now();
    recentMovements = [];
    startTracking();
  }
  
  function handleTouchMove(e) {
    e.preventDefault();
    if (!isTouching) return;
    const touch = e.touches[0];
    updateMovement(touch.clientX);
  }
  
  function handleTouchEnd(e) {
    e.preventDefault();
    stopInteraction();
  }
  
  function updateMovement(currentX) {
    if (lastX === null) {
      lastX = currentX;
      lastMoveTime = Date.now();
      return;
    }
    
    const now = Date.now();
    const deltaTime = Math.max(now - lastMoveTime, 1);
    const distancePixels = Math.abs(currentX - lastX);
    
    // Convert pixels to viewport width percentage
    const distanceVw = (distancePixels / window.innerWidth) * 100;
    
    // Calculate speed (vw per millisecond)
    const speed = distanceVw / deltaTime;
    
    // Add to recent movements history
    recentMovements.push(speed);
    if (recentMovements.length > MOVEMENT_HISTORY_SIZE) {
      recentMovements.shift();
    }
    
    lastX = currentX;
    lastMoveTime = now;
  }
  
  function getAverageSpeed() {
    if (recentMovements.length === 0) return 0;
    const sum = recentMovements.reduce((a, b) => a + b, 0);
    return sum / recentMovements.length;
  }
  
  function startTracking() {
    if (animationFrame) return;
    
    const update = () => {
      const now = Date.now();
      const timeSinceLastMove = now - lastMoveTime;
      
      let targetVolume = 0;
      
      if (timeSinceLastMove < 100) { // Recent movement
        // Calculate target volume from average speed
        const avgSpeed = getAverageSpeed();
        targetVolume = Math.min(avgSpeed * SPEED_TO_VOLUME, MAX_VOLUME);
      } else {
        // No recent movement - decay
        targetVolume = 0;
      }
      
      // Apply extra decay if finger is lifted
      const decayRate = isTouching ? DECAY_RATE : DECAY_RATE * RELEASE_MULTIPLIER;
      
      // Smooth volume toward target
      if (targetVolume > currentVolume) {
        // Rising - be responsive
        currentVolume = currentVolume * 0.7 + targetVolume * 0.3;
      } else {
        // Falling - smooth decay
        currentVolume = currentVolume * VOLUME_SMOOTHING + targetVolume * (1 - VOLUME_SMOOTHING);
        
        // Apply decay multiplier
        if (targetVolume === 0) {
          currentVolume *= decayRate;
        }
      }
      
      // Update audio
      updateAudio();
      
      // Continue tracking while touching or while volume is fading
      if (isTouching || currentVolume > 0.01) {
        animationFrame = requestAnimationFrame(update);
      } else {
        animationFrame = null;
        currentVolume = 0;
        recentMovements = [];
      }
    };
    
    animationFrame = requestAnimationFrame(update);
  }
  
  function updateAudio() {
    if (currentVolume > MIN_VOLUME_THRESHOLD) {
      if (!isPlaying) {
        // Start playing
        isPlaying = true;
        if (audioEngine) {
          audioEngine.playNote(note, `row-${rowIndex}`, currentVolume);
        }
      } else {
        // Update volume of playing note
        if (audioEngine) {
          audioEngine.setVelocity(`row-${rowIndex}`, currentVolume);
        }
      }
    } else {
      if (isPlaying) {
        // Stop playing
        isPlaying = false;
        if (audioEngine) {
          audioEngine.stopNote(`row-${rowIndex}`);
        }
      }
    }
  }
  
  function stopInteraction() {
    isTouching = false;
    lastX = null;
    // Volume will decay faster now that finger is lifted
  }
  
  $: visualIntensity = currentVolume;
</script>

<svelte:window 
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
/>

<div
  bind:this={element}
  class="row"
  class:touching={isTouching}
  class:playing={isPlaying}
  style="background-color: {color}; filter: brightness({1 + (visualIntensity * 0.3)});"
  on:mousedown={handleMouseDown}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  role="button"
  tabindex="0"
>
  <div class="note-label">
    {note}
  </div>
  
  {#if isTouching || isPlaying}
    <div class="volume-indicator" style="opacity: {visualIntensity * 0.5}"></div>
  {/if}
</div>

<style>
  .row {
    flex: 1;
    width: 100%;
    position: relative;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    padding: 0 2vw;
  }
  
  .note-label {
    position: absolute;
    left: 2vw;
    font-weight: 700;
    font-size: 2.5rem;
    color: rgba(50, 50, 50, 0.8);
    pointer-events: none;
    user-select: none;
    line-height: 1;
    text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
  }
  
  .volume-indicator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
    pointer-events: none;
  }
  
  @media (max-width: 480px) {
    .note-label {
      font-size: 2rem;
      left: 1vw;
    }
  }
  
  @media (orientation: landscape) and (max-height: 500px) {
    .note-label {
      font-size: 1.8rem;
    }
  }
</style>