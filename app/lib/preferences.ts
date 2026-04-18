export function readBooleanPreference(
  key: string,
  defaultValue: boolean,
  options?: {
    trueValue?: string;
  },
) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  const storedValue = window.localStorage.getItem(key);

  if (storedValue === null) {
    return defaultValue;
  }

  return storedValue === (options?.trueValue ?? 'on');
}

export function playPreferenceTone() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.18);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // Ignore browsers that block programmatic tones.
  }
}