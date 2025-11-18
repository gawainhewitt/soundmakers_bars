<script>
  import { onMount } from 'svelte';
  import ResponsiveContainer from './lib/ResponsiveContainer.svelte';
  import GridContainer from './lib/GridContainer.svelte';
  import SplashScreen from './lib/SplashScreen.svelte';
  import IconButton from './lib/IconButton.svelte';
  import OptionsScreen from './lib/OptionsScreen.svelte';
  import ModeToggle from './lib/ModeToggle.svelte';
  import { AudioEngine } from './lib/AudioEngine.js';

  let currentScreen = $state('splash');
  let audioEngine = $state(null);
  let audioInitialized = false;
  let playMode = $state('bow'); // 'bow' or 'pluck'

  let settings = $state(loadSavedSettings());

  function loadSavedSettings() {
    const saved = localStorage.getItem('bars-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Loaded saved settings on startup:', parsed);
        return parsed;
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
    
    return {
      topRow: { note: 'C4', visible: true },
      secondRow: { note: 'F4', visible: true },
      thirdRow: { note: 'G4', visible: true },
      bottomRow: { note: 'A4', visible: true },
      reverb: true
    };
  }

  onMount(() => {
    audioEngine = new AudioEngine();
  });

  async function handleSplashClick() {
    document.body.style.setProperty('background-color', 'rgb(240, 228, 66)', 'important');
    
    if (audioEngine && !audioInitialized) {
      await audioEngine.init();
      audioInitialized = true;
      console.log('Audio initialized from splash screen');
    }
    
    currentScreen = 'play';
    console.log('Current screen set to:', currentScreen);
    
    setTimeout(() => {
      window.scrollTo(0, 0);
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  function gracefullyStopAllNotes() {
    if (audioEngine && audioEngine.activeOscillators) {
      const activeNotes = Array.from(audioEngine.activeOscillators.keys());
      activeNotes.forEach(function(note) {
        audioEngine.stopNote(note);
      });
      console.log('Gracefully stopped all notes');
    }
  }

  function handleAboutClick() {
    gracefullyStopAllNotes();
    document.body.style.setProperty('background-color', 'white', 'important');
    currentScreen = 'about';
  }

  function handleOptionsClick() {
    gracefullyStopAllNotes();
    document.body.style.setProperty('background-color', 'white', 'important');
    currentScreen = 'options';
  }

  function handleAboutClose() {
    document.body.style.setProperty('background-color', 'rgb(240, 228, 66)', 'important');
    currentScreen = 'play';

    setTimeout(() => {
      window.scrollTo(0, 0);
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  function handleSettingsUpdate(event) {
    settings = event.detail;
    console.log('Settings updated:', settings);
    
    if (audioEngine) {
      audioEngine.setReverbEnabled(settings.reverb);
    }
  }

  function closeOptions() {
    document.body.style.setProperty('background-color', 'rgb(240, 228, 66)', 'important');
    currentScreen = 'play';
    
    setTimeout(() => {
      window.scrollTo(0, 0);
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  function handleModeChange(event) {
    playMode = event.detail;
    if (audioEngine) {
      audioEngine.setMode(playMode);
    }
  }
</script>

{#if currentScreen === 'splash'}
  <SplashScreen 
    title="Bars"
    instructions="To play: touch or click screen or use computer keyboard keys"
    footerNote="On Apple devices, turn off silent mode"
    on:click={handleSplashClick}
  />
{:else if currentScreen === 'about'}
  <SplashScreen 
    title="Bars"
    instructions="To play: touch or click screen or use computer keyboard keys"
    footerNote="On Apple devices, turn off silent mode"
    on:click={handleAboutClose}
  />
{:else if currentScreen === 'options'}
  <OptionsScreen 
      on:updateSettings={handleSettingsUpdate}
      on:close={closeOptions} 
  />
{:else if currentScreen === 'play'}
  <div style="position: fixed; top: 20px; left: 20px; z-index: 1000;">
    <IconButton 
      type="info" 
      ariaLabel="About"
      on:click={handleAboutClick}
    />
  </div>
  
  <ModeToggle 
    mode={playMode}
    on:change={handleModeChange}
  />
  
  <div style="position: fixed; top: 20px; right: 90px; z-index: 1000;">
    <IconButton 
      type="settings" 
      ariaLabel="Options"
      on:click={handleOptionsClick}
    />
  </div>

  <main>
    <ResponsiveContainer>
      <GridContainer 
        {audioEngine}
        {playMode}
        {settings}
      />
    </ResponsiveContainer>
  </main>
{/if}

<style>
  main {
    text-align: center;
    padding: 1em;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0;
  }

  @media (orientation: landscape) and (max-height: 500px) {
    main {
      padding: 0.5em;
    }
  }
</style>