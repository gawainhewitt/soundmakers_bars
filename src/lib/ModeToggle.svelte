<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let mode = 'bow'; // 'bow' or 'pluck'
  
  function handleClick() {
    const newMode = mode === 'bow' ? 'pluck' : 'bow';
    dispatch('change', newMode);
  }
</script>

<button 
  class="mode-toggle"
  on:click={handleClick}
  aria-label="Toggle between bow and pluck modes"
  type="button"
>
  <span class="mode-label">{mode === 'bow' ? 'BOW' : 'PLUCK'}</span>
</button>

<style>
  .mode-toggle {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    padding: 12px 24px;
    border-radius: 25px;
    background-color: rgba(255, 255, 255, 0.9);
    border: 2px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .mode-toggle:hover {
    background-color: rgba(255, 255, 255, 1);
    transform: translateX(-50%) scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .mode-toggle:active {
    transform: translateX(-50%) scale(0.95);
  }
  
  .mode-label {
    font-weight: 700;
    font-size: 1rem;
    color: #333;
    letter-spacing: 0.05em;
  }
  
  @media (max-width: 480px) {
    .mode-toggle {
      padding: 10px 20px;
      top: 15px;
    }
    
    .mode-label {
      font-size: 0.9rem;
    }
  }
</style>