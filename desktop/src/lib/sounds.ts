// Sound utility for playing notification sounds

// Generate a simple beep tone using Web Audio API
function generateTone(frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine'): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = audioContext.sampleRate;
  const numSamples = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    if (type === 'square') {
      data[i] = data[i] > 0 ? 1 : -1;
    } else if (type === 'triangle') {
      data[i] = 2 * Math.abs(2 * ((i * frequency / sampleRate) % 1) - 1) - 1;
    }
  }

  return buffer;
}

// Play a generated tone with low-pass filter for softer, blurrier sound
function playTone(frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine', volume: number = 0.3) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = generateTone(frequency, duration, type);
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    // Low-pass filter for softer, blurrier sound
    filter.type = 'lowpass';
    filter.frequency.value = 2000; // Cut off high frequencies
    filter.Q.value = 1; // Gentle rolloff
    
    // Envelope for softer attack and release
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Soft attack
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + duration * 0.7); // Gradual decay
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Soft release
    
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.error("Error playing tone:", error);
  }
}

// Sound effects - all lowered in pitch and softened
export const sounds = {
  // Message sent sound - removed (user preference)
  messageSent: () => {
    // Sound removed - no longer plays
    return;
  },

  // Message sending sound (subtle low click)
  messageSending: () => {
    if (localStorage.getItem("soundsEnabled") === "false") return;
    playTone(250, 0.08, 'sine', 0.12); // Lowered from 600 to 250
  },

  // Notification sound (gentle low chime)
  notification: () => {
    if (localStorage.getItem("soundsEnabled") === "false") return;
    // Play two lower tones for a pleasant, blurry chime
    playTone(262, 0.2, 'sine', 0.2); // C4 (lowered from C5)
    setTimeout(() => {
      playTone(330, 0.2, 'sine', 0.2); // E4 (lowered from E5)
    }, 120);
  },

  // Message received sound
  messageReceived: () => {
    if (localStorage.getItem("soundsEnabled") === "false") return;
    playTone(262, 0.2, 'sine', 0.4); // C4 - louder and longer
    setTimeout(() => {
      playTone(330, 0.2, 'sine', 0.4); // E4 - louder and longer
    }, 120);
  },

  // Meeting started sound (low, soft attention sound)
  meetingStarted: () => {
    if (localStorage.getItem("soundsEnabled") === "false") return;
    // Play a sequence of lower tones
    playTone(220, 0.25, 'sine', 0.25); // A3 (lowered from A4)
    setTimeout(() => {
      playTone(277, 0.25, 'sine', 0.25); // C#4 (lowered from C#5)
    }, 180);
    setTimeout(() => {
      playTone(330, 0.35, 'sine', 0.25); // E4 (lowered from E5)
    }, 360);
  },

  // Call initiated sound (low ringing/connecting sound)
  callInitiated: () => {
    if (localStorage.getItem("soundsEnabled") === "false") return;
    // Play a lower ringing tone sequence
    playTone(262, 0.25, 'sine', 0.2); // C4 (lowered from C5)
    setTimeout(() => {
      playTone(330, 0.25, 'sine', 0.2); // E4 (lowered from E5)
    }, 220);
    setTimeout(() => {
      playTone(392, 0.25, 'sine', 0.2); // G4 (lowered from G5)
    }, 440);
  },

  // Call ringing sound (repeating) - Facebook Messenger style
  callRinging: () => {
    if (localStorage.getItem("soundsEnabled") === "false") return;
    // Facebook Messenger-like ringtone: upward melody
    playTone(523, 0.15, 'sine', 0.25); // C5
    setTimeout(() => {
      playTone(659, 0.15, 'sine', 0.25); // E5
    }, 150);
    setTimeout(() => {
      playTone(784, 0.15, 'sine', 0.25); // G5
    }, 300);
    setTimeout(() => {
      playTone(1047, 0.25, 'sine', 0.25); // C6
    }, 450);
  },
};

// Call ringing interval handler
let ringingInterval: NodeJS.Timeout | null = null;

export function startCallRinging() {
  if (localStorage.getItem("soundsEnabled") === "false") return;
  stopCallRinging(); // Clear any existing interval
  sounds.callRinging(); // Play immediately
  ringingInterval = setInterval(() => {
    sounds.callRinging();
  }, 3000); // Repeat every 3 seconds (Facebook Messenger timing)
}

export function stopCallRinging() {
  if (ringingInterval) {
    clearInterval(ringingInterval);
    ringingInterval = null;
  }
}

// Check if sounds are enabled
export function areSoundsEnabled(): boolean {
  return localStorage.getItem("soundsEnabled") !== "false";
}

