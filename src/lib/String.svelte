<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let color = 'rgb(230, 159, 0)';
  export let index = 0;
  export let stringId = '';
  export let note = 'C4';
  export let audioEngine = null;
  export let isDragging = false;
  export let isAnimating = false;
  
  let element;
  let localAnimating = false;
  let hasBeenTriggeredInThisDrag = false;
  let lastTriggerTime = 0; 
  const ANIMATION_DURATION = 300;
  const MIN_RETRIGGER_INTERVAL = 200; // Minimum ms between triggers 
  
  $: effectiveAnimating = isAnimating || localAnimating;
  
  function triggerString() {
    const now = Date.now();
    
    // CHANGE: Use time-based check instead of boolean flag
    if (now - lastTriggerTime < MIN_RETRIGGER_INTERVAL) {
      return; // Too soon to re-trigger
    }
    
    lastTriggerTime = now;
    localAnimating = true;
    
    // Play the sound
    if (audioEngine) {
      audioEngine.playNote(note, stringId);
    }
    
    dispatch('trigger', { index, stringId, note });
    
    // Reset animation state after animation completes
    setTimeout(() => {
      localAnimating = false;
    }, ANIMATION_DURATION);
  }
  
  function handleClick() {
    triggerString();
  }
  
  function handleMouseEnter() {
    if (isDragging && !hasBeenTriggeredInThisDrag) {
      hasBeenTriggeredInThisDrag = true;
      triggerString();
    }
  }
  
  function handleMouseLeave() {
    if (isDragging) {
      hasBeenTriggeredInThisDrag = false;
    }
  }
  
  function handleTouchStart(e) {
    e.preventDefault();
    triggerString();
  }
  
  function handleGlobalTouchMove(e) {
    if (!element) return;
    
    const now = Date.now();
    // CHANGE: Use time check here too
    if (now - lastTriggerTime < MIN_RETRIGGER_INTERVAL) return;
    
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const rect = element.getBoundingClientRect();
      
      if (touch.clientX >= rect.left && 
          touch.clientX <= rect.right && 
          touch.clientY >= rect.top && 
          touch.clientY <= rect.bottom) {
        triggerString();
        break;
      }
    }
  }
  
  $: if (!isDragging) {
    hasBeenTriggeredInThisDrag = false;
  }
</script>

<svelte:window 
  on:touchmove={handleGlobalTouchMove}
/>

<div
  bind:this={element}
  class="string"
  class:vibrating={effectiveAnimating}
  style="background-color: {color};"
  on:mousedown={handleClick}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  on:touchstart={handleTouchStart}
  role="button"
  tabindex="0"
>
</div>

<style>
  .string {
    width: 3vw;
    height: 100%;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 0.1s ease;
  }

  .string.vibrating {
    animation: wiggle 0.3s ease-in-out;
  }

  .string:focus {
    outline: none;
  }

  @keyframes wiggle {
    0% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(-3deg);
    }
    50% {
      transform: rotate(0deg);
    }
    75% {
      transform: rotate(3deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }
</style>